# How RAG Works on the Week 3 Policy Dataset

This guide explains how RAG will be implemented on the Week 3 dataset.

The terms are explained in implementation order.

## Final product flow

```txt
Policy files
→ ingest
→ chunk
→ embed
→ store in pgvector
→ build query from claim + question
→ retrieve policy chunks
→ generate grounded answer
→ validate citations
→ save answer
→ run eval
```

## 1. Knowledge base

The knowledge base is the set of documents the system can search.

For Week 3, the knowledge base is:

```txt
sample-data/week-03-policy-rag/policies/
```

These policy files contain clauses such as:

```txt
COV-TH-001
EV-TH-001
EX-COM-001
LIMIT-RP-001
```

The model should answer only from retrieved chunks from this knowledge base, not from the entire corpus or outside insurance knowledge.

## 2. Ingestion

Ingestion means reading source documents and preparing them for storage.

Input:

```txt
policies/*.md
```

Output:

```txt
PolicyDocument rows
PolicyChunk rows
```

Example:

```txt
auto-policy-synthetic-01.md
→ one PolicyDocument
→ multiple PolicyChunk rows
```

## 3. PolicyDocument

A `PolicyDocument` represents one source policy file.

Example:

```txt
auto-policy-synthetic-01.md
```

Stores:

```txt
title
productType
version
sourcePath
sourceType
contentHash
```

This tells the system where each policy chunk came from.

For the current synthetic dataset, `insurerName` can stay `null` because the policy files do not contain an `INSURER_NAME` field.

## 4. Chunking

Chunking means splitting documents into smaller searchable pieces.

For this dataset, chunk by clause.

Example source:

```md
## CLAUSE EV-TH-001: Theft claim evidence requirements

Theft claims require a police FIR number or police report evidence...
```

Becomes one chunk:

```json
{
  "clauseId": "EV-TH-001",
  "sectionTitle": "Theft claim evidence requirements",
  "text": "## CLAUSE EV-TH-001: Theft claim evidence requirements\n\nTheft claims require a police FIR number or police report evidence..."
}
```

The chunk text keeps the original markdown heading because the heading is useful for citation display, debugging, and answer grounding.

Clause-based chunking is better here because answers can cite exact clause IDs.

## 5. PolicyChunk

A `PolicyChunk` is one retrievable policy clause.

Stores:

```txt
policyDocumentId
chunkIndex
clauseId
sectionTitle
text
embedding
```

This is the table vector search will retrieve from.

## 6. Embeddings

An embedding is a numeric representation of text.

Example text:

```txt
Theft claims require a police FIR number or police report evidence.
```

Becomes a vector:

```txt
[0.012, -0.044, 0.087, ...]
```

Similar meanings should have similar vectors.

Example:

```txt
Query:
Is FIR required for theft claim?

Should be close to:
EV-TH-001 theft claim evidence requirements
```

For Week 3, ClaimFlow will use Gemini embeddings and store vectors in `policy_chunks.embedding`.

The current DB column is:

```txt
embedding vector(768)
```

So the embedding implementation must use a 768-dimensional output, or the schema must be updated to match the model output dimension.

## 7. Vector storage

Policy chunk embeddings are stored in Postgres using pgvector.

Table:

```txt
policy_chunks
```

Important column:

```txt
embedding vector(768)
```

This lets the app run similarity search over policy clauses.

## 8. Query building

For run-specific coverage questions, build a richer retrieval query from the user question plus claim context.

Useful fields:

```txt
user question
lossType
claim description
missingEvidence
supportingDocuments
damage estimate
usageAtIncident
```

Example:

```txt
Question:
Is this theft claim ready for approval if FIR number is missing?

Claim context:
lossType = theft
firNumber = null
policeReport = false
missingEvidence = FIR number, police report

Retrieval query:
theft claim approval FIR missing police report required evidence vehicle theft coverage
```

This improves retrieval quality because the query contains both the user's intent and the claim facts.

For generic policy questions where there is no claim context, embedding only the user question is acceptable.

## 9. Query embedding

The retrieval query is embedded using the same embedding model.

Then the query vector is compared against stored policy chunk vectors.

## 10. Retrieval

Retrieval returns the most relevant policy chunks.

Default:

```txt
topK = 5
minSimilarity = 0.72
```

Example output:

```json
{
  "retrievalStatus": "ENOUGH_EVIDENCE",
  "matches": [
    {
      "chunkId": "...",
      "clauseId": "EV-TH-001",
      "sectionTitle": "Theft claim evidence requirements",
      "similarity": 0.84,
      "text": "## CLAUSE EV-TH-001: Theft claim evidence requirements\n\nTheft claims require a police FIR number..."
    }
  ]
}
```

## 11. Retrieval threshold

Before generation, check whether retrieval is strong enough.

Rules:

```txt
If no chunks are retrieved → NEEDS_REVIEW / insufficient evidence
If top similarity is below threshold → NEEDS_REVIEW / insufficient evidence
If no relevant clause supports the question → NEEDS_REVIEW / refusal
```

This prevents the model from answering when policy evidence is weak.

## 12. Context for generation

Context is what the model receives at answer time.

For Week 3, context should include only:

```txt
user question
claim context
retrieved policy chunks
output schema
```

Do not pass the entire policy corpus.

Retrieved clauses explain what the policy says.

Claim context explains what happened in the specific claim.

The final answer needs both.

## 13. Grounded generation

Grounded generation means the model answers only from retrieved chunks.

Prompt rule:

```txt
You are a policy coverage assistant for ClaimFlow AI.
Answer only using the retrieved policy clauses.
Do not use outside insurance knowledge.
If evidence is missing, return NEEDS_REVIEW.
Every reason must cite a retrieved clauseId.
```

Expected output shape:

```json
{
  "decision": "NEEDS_REVIEW",
  "answer": "...",
  "citedClauses": [
    {
      "clauseId": "EV-TH-001",
      "chunkId": "...",
      "quote": "Theft claims require a police FIR number or police report evidence...",
      "relevance": "Requires FIR or police report evidence."
    }
  ],
  "missingEvidence": ["FIR number", "police report"],
  "confidence": 0.82
}
```

## 14. Citation validation

Do not trust citations blindly.

After the model answers, validate:

```txt
Every cited chunkId was retrieved.
Every cited clauseId was retrieved.
Every non-refusal answer has citations.
NOT_COVERED cites an exclusion clause.
COVERED is blocked if required evidence is missing.
Unsupported questions return NEEDS_REVIEW / refusal.
```

This is the main Week 3 guardrail.

## 15. CoverageQuestion

Save each RAG answer as a `CoverageQuestion`.

Stores:

```txt
runId
question
normalizedQuery
retrievalJson
answerJson
finalDecision
```

This keeps RAG separate from extraction.

Do not add coverage decisions to `ExtractionRun.status`.

## 16. Eval

The eval script will read:

```txt
questions/coverage-questions.json
packets/*/claim-context.json
expected/*.json
```

For each question, it will:

```txt
load claim context
build query
retrieve chunks
check expectedRetrievedClauses
generate answer
validate citations
compare expectedAnswerType
write report
```

Output:

```txt
eval-results/week-3-policy-rag-eval.md
eval-results/week-3-policy-rag-eval.json
```

## 17. Metrics

The eval should calculate:

```txt
retrieval_hit_rate
citation_present_rate
citation_support_rate
unsupported_answer_rate
coverage_decision_match_rate
false_approval_rate
```

Most important:

```txt
false_approval_rate = 0
```

## 18. Example: theft missing FIR

Input:

```txt
question = Is this theft claim ready for approval if the FIR number is missing?
lossType = theft
firNumber = null
policeReport = false
missingEvidence = FIR number, police report
```

Expected retrieval:

```txt
COV-TH-001
EV-TH-001
```

Expected answer:

```txt
NEEDS_REVIEW
```

Reason:

```txt
Theft may be covered, but FIR / police report evidence is required and missing.
```

Valid citations:

```txt
COV-TH-001
EV-TH-001
```

## 19. Success condition

Week 3 succeeds when the system can prove:

```txt
It does not approve a claim unless retrieved policy evidence supports approval.
```

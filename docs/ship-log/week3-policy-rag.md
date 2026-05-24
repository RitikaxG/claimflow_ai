# Week 3 Ship Log — Policy RAG + Citations

## Summary

Week 3 upgraded ClaimFlow AI from extraction + human review into a policy-grounded coverage assistant.

Week 1 flow:

```txt
PDF / Email text
→ AI extraction
→ deterministic validation
→ COMPLETED or NEEDS_REVIEW
```

Week 2 flow:

```txt
PDF / Email text
→ AI extraction
→ validation
→ ReviewTask
→ human review decision
→ corrected JSON / final review state
```

Week 3 flow:

```txt
reviewed or extracted claim context
+ coverage question
→ policy retrieval query plan
→ embedded query
→ pgvector policy clause search
→ retrieved policy evidence
→ grounded answer generation
→ citation verification
→ CoverageQuestion stored
```

Demo: TODO — add X demo link after recording/posting.

---

## What shipped

### 1. Policy-grounded answer layer

The system can now answer coverage questions using retrieved policy clauses instead of relying on the model's general insurance knowledge.

The Week 3 product behavior is:

```txt
User asks a claim coverage question
→ system retrieves relevant policy clauses
→ model answers only from retrieved clauses
→ answer cites the policy clauses used
→ weak or unsupported evidence becomes NEEDS_REVIEW
```

This keeps RAG connected to the ClaimFlow workflow instead of becoming a generic chatbot.

---

### 2. Synthetic policy corpus for deterministic RAG

Added a controlled Week 3 policy corpus under:

```txt
sample-data/week-03-policy-rag/
```

The corpus includes synthetic auto-insurance policy markdown files covering:

```txt
base coverages
exclusions
required evidence
repair approval limits
```

Important clause families:

```txt
COV-*      coverage clauses
EV-*       required evidence clauses
EX-*       exclusion clauses
LIMIT-*    approval limit clauses
```

This gives the RAG system stable, repeatable policy evidence for retrieval and evals.

---

### 3. Clause-based policy chunking

Policy markdown is parsed into policy metadata and clauses.

Chunking strategy:

```txt
one policy clause = one retrievable chunk
```

Each chunk preserves:

```txt
policy title
clauseId
sectionTitle
full clause text
chunkIndex
tokenCount
```

This is better than arbitrary character chunking for ClaimFlow because coverage answers need auditable clause-level citations.

---

### 4. Idempotent policy loader

Policy loading is safe to re-run.

Loader behavior:

```txt
read policy markdown files
→ parse policy metadata + clauses
→ compute content hash
→ upsert PolicyDocument by sourcePath
→ skip unchanged documents
→ rebuild chunks when content changes or force reload is enabled
```

If a policy file is unchanged, existing chunks and embeddings are preserved.

This prevents accidental embedding churn during local development.

---

### 5. Gemini embeddings + pgvector storage

Policy chunks are embedded with Gemini embeddings using 768 dimensions.

Formatting strategy:

```txt
policy chunks:
title: <policy title> | text: Clause <clauseId> — <sectionTitle> ...

questions:
task: question answering | query: <question>
```

The vectors are stored in Postgres using pgvector.

This keeps vector search close to the existing ClaimFlow relational workflow instead of introducing a separate vector database too early.

---

### 6. Manual vector search smoke test

A smoke test verifies that a natural-language coverage question can retrieve matching policy clauses.

Example question:

```txt
Is this theft claim ready for approval if FIR number is missing?
```

Expected top clauses:

```txt
EV-TH-001   Theft claim evidence requirements
COV-TH-001  Theft coverage
```

This proves the base embedding + vector search loop is working.

---

### 7. Multi-query retrieval strategy

Retrieval does not rely only on the raw user question.

The system builds a focused query plan from:

```txt
user question
+ claim context
+ missing evidence
+ loss type
+ review-corrected claim data when available
```

Example theft query plan:

```txt
general  → original user question
evidence → theft FIR police report required evidence approval
coverage → theft stolen vehicle coverage reported to police
```

Supported retrieval intents:

```txt
general
coverage
evidence
exclusion
limit
```

This makes retrieval more reliable because one user question can require multiple policy angles.

---

### 8. Retrieval dedupe + scoring

Because multiple focused queries can retrieve the same chunk, the system merges duplicates.

Merge behavior:

```txt
dedupe by chunkId
keep max similarity
record all matched query intents
store bestIntent from the strongest match
sort by similarity
return final topK matches
```

This keeps the final evidence list clean while preserving retrieval debugging information.

---

### 9. Retrieval refusal thresholds

The system now decides whether retrieved evidence is strong enough before generating an answer.

Basic refusal rules:

```txt
no matches → INSUFFICIENT_EVIDENCE
no clause IDs → INSUFFICIENT_EVIDENCE
top similarity below threshold → INSUFFICIENT_EVIDENCE
only generic query + weak similarity → INSUFFICIENT_EVIDENCE
```

This prevents weak, semantically adjacent policy chunks from becoming hallucinated coverage answers.

---

### 10. Retrieval API and policy APIs

Added API support for the RAG layer:

```txt
POST /api/policies/ingest
GET  /api/policies
POST /api/rag/retrieve
POST /api/extraction-runs/[runId]/coverage-answer
```

The policy APIs help load/list the policy corpus.

The retrieval API returns:

```txt
question
retrievalStatus
reason
queryPlan
ranked policy matches
similarity scores
matched query intents
```

The coverage answer API runs the full RAG answer flow for an extraction run.

---

### 11. Grounded answer generation

The answer generation prompt receives only:

```txt
user question
claim context
retrieval status
retrieved policy clauses
```

The model is instructed to:

```txt
answer only from retrieved clauses
avoid outside insurance knowledge
cite clauseId and chunkId
copy cited quotes from retrieved text
return NEEDS_REVIEW when evidence is missing or insufficient
```

Output schema:

```txt
decision
answer
citedClauses
missingEvidence
confidence
```

Supported decisions:

```txt
COVERED
NOT_COVERED
PARTIALLY_COVERED
NEEDS_REVIEW
```

---

### 12. Citation verification guardrails

Generated answers are not trusted directly.

The system verifies every citation:

```txt
cited chunkId must be in retrieved matches
cited clauseId must match the retrieved chunk
quoted text must exist inside the retrieved policy chunk
answer must contain valid citations unless forced to review
COVERED requires coverage-oriented retrieved evidence
```

Guardrails can override the model and force:

```txt
NEEDS_REVIEW
```

This makes the model a draft writer, not the final authority.

---

### 13. CoverageQuestion persistence

Each coverage question is stored with:

```txt
question
normalized retrieval query plan
retrievalStatus
retrievalJson
answerJson
finalDecision
```

This gives the app a traceable record of:

```txt
what the user asked
what was retrieved
what the model answered
which citations survived verification
whether guardrails forced review
```

---

### 14. Reuse of previous answers

For the same run and normalized question, the API can reuse a previously stored `CoverageQuestion` instead of regenerating the answer.

This reduces repeated model calls and keeps local testing more stable.

---

### 15. Week 3 RAG eval

Added a Week 3 eval script:

```bash
bun run eval:week3:rag
```

The eval checks:

```txt
required clause retrieval
expected coverage decision
citation presence
citation support
unsupported question refusal
false approval prevention
missing evidence mentions
```

Expected reports:

```txt
sample-data/week-03-policy-rag/eval-results/week-3-policy-rag-eval.md
sample-data/week-03-policy-rag/eval-results/week-3-policy-rag-eval.json
```

Current status:

```txt
Retrieval smoke tests are implemented.
Full answer-generation eval should be re-run after the Gemini API limit refreshes.
```

---

## What this proves

Week 3 proves that ClaimFlow AI can use RAG as a safety layer for policy-grounded claim decisions.

```txt
Claim context
→ policy evidence retrieval
→ grounded answer generation
→ citation verification
→ safe NEEDS_REVIEW fallback
```

The important product behavior is not simply that the model can answer.

The important behavior is:

```txt
If the system cannot retrieve enough policy evidence, it should not pretend it knows the answer.
```

---

## Week 3 result

By the end of Week 3, ClaimFlow AI has a working policy RAG subsystem:

```txt
synthetic policy corpus
→ clause chunks
→ embeddings
→ vector storage
→ multi-query retrieval
→ retrieval thresholds
→ grounded answer generation
→ citation guardrails
→ persisted coverage questions
→ eval framework
```

Week 3 is almost complete. The remaining step is the final eval re-run after API quota refresh.

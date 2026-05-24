# Week 03 — Policy RAG + Citations Dataset

This dataset tests whether ClaimFlow AI can answer claim coverage questions using retrieved policy clauses with citations.

Week 3 is not a generic chatbot. It is a policy-grounded decision-support layer:

```txt
claim context
+ coverage question
+ retrieved policy clauses
→ cited coverage answer
→ NEEDS_REVIEW / refusal when evidence is missing or retrieval is weak
```

## Dataset goal

The dataset checks whether the system can:

- retrieve the correct policy clauses
- cite the retrieved clauses in the answer
- avoid unsupported approvals
- return `NEEDS_REVIEW` when required claim evidence is missing
- refuse or mark insufficient evidence when no policy clause supports the question
- produce eval evidence for retrieval, citation, and decision quality

## Folder structure

```txt
sample-data/week-03-policy-rag/
  README.md

  policies/
    auto-policy-synthetic-01.md
    auto-policy-synthetic-02-exclusions.md
    auto-policy-synthetic-03-evidence.md
    public-policy-anchor-sources.md

  questions/
    coverage-questions.json

  packets/
    w3-001-theft-missing-fir-policy-question/
      manifest.json
      claim-context.json
      expected-answer.json

    w3-002-third-party-police-report-question/
      manifest.json
      claim-context.json
      expected-answer.json

    w3-003-repair-estimate-coverage-limit/
      manifest.json
      claim-context.json
      expected-answer.json

    w3-004-excluded-commercial-use/
      manifest.json
      claim-context.json
      expected-answer.json

    w3-005-ambiguous-flood-damage/
      manifest.json
      claim-context.json
      expected-answer.json

  expected/
    retrieval.expected.json
    answers.expected.json

  eval-results/
    week-3-policy-rag-eval.md
    week-3-policy-rag-eval.json
```

## How to read this dataset

```txt
policies/      = source policy documents for RAG
questions/     = eval questions
packets/       = synthetic claim contexts
expected/      = global eval rules
eval-results/  = generated eval reports
```

## Policy corpus

The `policies/` folder is the RAG knowledge base.

These files are ingested, parsed, chunked, embedded, and retrieved during Week 3.

### `auto-policy-synthetic-01.md`

Base coverage clauses.

Important clauses:

```txt
COV-OD-001    Own damage coverage
COV-TP-001    Third-party liability coverage
COV-TH-001    Theft coverage
LIMIT-RP-001  Repair estimate approval limit
```

Used for coverage and approval-limit questions.

### `auto-policy-synthetic-02-exclusions.md`

Exclusion clauses.

Important clauses:

```txt
EX-LIC-001    Invalid license exclusion
EX-ALC-001    Intoxication exclusion
EX-COM-001    Commercial use exclusion
EX-WEAR-001   Wear and tear exclusion
```

Used to test `NOT_COVERED` decisions and false-approval prevention.

### `auto-policy-synthetic-03-evidence.md`

Required-evidence clauses.

Important clauses:

```txt
EV-TH-001    Theft claim evidence requirements
EV-TP-001    Third-party claim evidence requirements
EV-OD-001    Own damage evidence requirements
EV-FLD-001   Flood damage evidence requirements
```

Used to test `NEEDS_REVIEW` decisions when evidence is incomplete.

### `public-policy-anchor-sources.md`

Placeholder for public policy PDFs or links.

Public policy documents are anchor/reference material only for now. They are not the deterministic source of truth for the first RAG eval and should not be ingested as eval policy chunks yet.

## Chunking contract

Week 3 uses clause-based chunking.

```txt
one policy clause = one retrievable chunk
```

Each retrieved chunk should preserve:

```txt
clauseId
sectionTitle
policyTitle
full clause text
tokenCount
```

This makes answer citations stable and auditable.

## Embedding + retrieval contract

Policy chunks are embedded as policy text.

Questions are embedded as question-answering queries.

Expected retrieval flow:

```txt
coverage question
+ claim context
→ focused query plan
→ vector search
→ merged policy chunks
→ retrieval status
```

Retrieval can return:

```txt
ENOUGH_EVIDENCE
INSUFFICIENT_EVIDENCE
```

The system should not generate a coverage answer when retrieval is insufficient.

## Retrieval strategies tested

The dataset is designed around these retrieval strategies:

```txt
clause-based chunking
claim-aware query expansion
multi-query retrieval
intent-labeled retrieval
vector similarity ranking
duplicate chunk merging
similarity thresholds
general-only stricter threshold
```

Supported retrieval intents:

```txt
general
coverage
evidence
exclusion
limit
```

## `questions/coverage-questions.json`

This file contains the 12 eval questions.

Each question defines:

```json
{
  "questionId": "W3-COV-001",
  "packetId": "w3-001-theft-missing-fir-policy-question",
  "question": "Is this theft claim ready for approval if the FIR number is missing?",
  "expectedRetrievedClauses": ["COV-TH-001", "EV-TH-001"],
  "expectedAnswerType": "NEEDS_REVIEW",
  "expectedCitationRequired": true,
  "expectedRefusal": false,
  "falseApprovalAllowed": false
}
```

Important fields:

- `questionId`: stable eval ID
- `packetId`: claim context to use, if any
- `question`: user-facing coverage question
- `expectedRetrievedClauses`: clauses retrieval should find
- `expectedAnswerType`: expected final decision
- `expectedCitationRequired`: whether citations are required
- `expectedRefusal`: whether insufficient evidence/refusal is expected
- `falseApprovalAllowed`: should be `false` for safety-critical cases

## `packets/`

Packets are synthetic claim contexts.

They are not raw PDFs or emails. They represent the structured claim data that Week 1 extraction and Week 2 review would already produce.

Each packet has:

```txt
manifest.json
claim-context.json
expected-answer.json
```

### `manifest.json`

Packet metadata:

- scenario being tested
- linked question IDs
- expected answer type
- expected retrieved clauses
- risk type
- whether false approval is allowed

### `claim-context.json`

Structured claim context:

- claim number
- policy number
- vehicle details
- incident details
- damage details
- police details
- supporting documents
- missing evidence

This context is combined with the user question to create a better retrieval query.

### `expected-answer.json`

Packet-level expected behavior:

- expected decision
- expected retrieved clauses
- citation requirement
- refusal expectation
- missing evidence that must be mentioned
- whether false approval is allowed

## Packet scenarios

### `w3-001-theft-missing-fir-policy-question`

Tests theft coverage with missing FIR / police report evidence.

Expected:

```txt
Retrieve: COV-TH-001, EV-TH-001
Answer: NEEDS_REVIEW
Must mention: FIR number, police report
False approval: not allowed
```

### `w3-002-third-party-police-report-question`

Tests third-party claim with missing police report evidence.

Expected:

```txt
Retrieve: COV-TP-001, EV-TP-001
Answer: NEEDS_REVIEW
Must mention: police report
False approval: not allowed
```

### `w3-003-repair-estimate-coverage-limit`

Tests high repair estimate requiring insurer review.

Expected:

```txt
Retrieve: LIMIT-RP-001, EV-OD-001
Answer: NEEDS_REVIEW
Must mention: insurer review
False approval: not allowed
```

### `w3-004-excluded-commercial-use`

Tests commercial use exclusion.

Expected:

```txt
Retrieve: EX-COM-001
Answer: NOT_COVERED
Must cite: commercial use exclusion
False approval: not allowed
```

### `w3-005-ambiguous-flood-damage`

Tests possible flood coverage with incomplete evidence.

Expected:

```txt
Retrieve: COV-OD-001, EV-FLD-001
Answer: NEEDS_REVIEW
Must mention: flood/waterlogging evidence, inspection evidence, exclusion uncertainty
False approval: not allowed
```

## `expected/`

Global eval rules.

### `retrieval.expected.json`

Defines retrieval success.

Main rule:

```txt
A question passes retrieval if all expectedRetrievedClauses appear in the retrieved chunks.
```

Default expectations:

```txt
topK = 5 or 8 depending on runner
required clause IDs must appear in retrievedClauseIds
unsupported questions should not force a confident answer
```

### `answers.expected.json`

Defines answer quality rules.

Main rules:

```txt
Every non-refusal answer must include at least one citation.
Each citation must refer to a retrieved chunk.
Each cited quote must exist in the retrieved chunk text.
A COVERED answer is invalid if required evidence is missing.
A NOT_COVERED answer must cite an exclusion clause.
Unsupported policy questions must return NEEDS_REVIEW or refusal.
false_approval_rate must be 0.
```

## `eval-results/`

Stores generated reports.

Expected output:

```txt
week-3-policy-rag-eval.md
week-3-policy-rag-eval.json
```

Current note:

```txt
Full answer-generation eval should be re-run after Gemini API quota refresh.
Do not mark Week 3 eval as final until the report is regenerated from a successful run.
```

## Eval metrics

```txt
retrieval_hit_rate
coverage_decision_match_rate
citation_present_rate
citation_support_rate
unsupported_refusal_rate
false_approval_rate
```

Most important metric:

```txt
false_approval_rate = 0
```

## How to run Week 3 setup + eval

From the repo root:

```bash
bun run rag:load-policies
bun run rag:embed-policies
bun run rag:smoke:retrieval-cases
bun run eval:week3:rag
```

Recommended order:

```txt
1. Load policies
2. Embed policy chunks
3. Run retrieval smoke cases
4. Run full Week 3 RAG eval after API quota is available
5. Commit eval-results markdown + JSON reports
```

## What this dataset is not

This is not:

- a real insurance dataset
- a fine-tuning dataset
- a chatbot dataset
- legal coverage advice
- a replacement for human review

It is a controlled engineering dataset for testing policy RAG, citations, refusal behavior, and false-approval prevention.

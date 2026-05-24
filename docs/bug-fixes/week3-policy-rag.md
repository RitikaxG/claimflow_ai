# Week 3 Bugs + Failure Cases — Policy RAG + Citations

Week 3 introduced a new policy RAG subsystem. These are the main bugs and failure cases handled while moving from policy ingestion to grounded answer generation.

Proof screenshots are centralized in `docs/week-03/policy-rag-architecture.md`. This bug-fix doc keeps only the failure, fix, and why-it-matters notes.

---

## 1. Postgres did not know the `vector` type

### Problem

The first pgvector migration failed because the database did not have the `vector` extension available.

Typical failure:

```txt
ERROR: type "vector" does not exist
```

This blocked the `policy_chunks.embedding vector(768)` column.

### Fix

Use a pgvector-enabled Postgres setup and ensure the migration enables the vector extension before creating vector columns.

The intended DB foundation is:

```txt
Postgres
+ pgvector extension
+ policy_chunks.embedding vector(768)
```

Final DB design after pgvector and Week 3 RAG tables:

### Why it matters

RAG depends on vector storage and cosine similarity search. Without pgvector, the project would either fail at migration time or fall back to fake in-memory similarity.

---

## 2. Policy loading needed to be safe to re-run

### Problem

During local development, policy files are loaded multiple times.

A naive loader would duplicate policy documents and chunks or keep stale chunks after policy edits.

### Fix

The loader computes a content hash per policy file and treats `sourcePath` as the stable policy identity.

Behavior:

```txt
same sourcePath + same contentHash → skip
same sourcePath + changed contentHash → rebuild chunks
force reload enabled → rebuild chunks
```

Policy loader output after successful idempotent load:

Policy document/chunk rows are visible in the database after loading.

### Why it matters

Policy ingestion can be re-run without corrupting the corpus or wasting embedding calls.

---

## 3. Public policy anchor file should not enter the deterministic eval corpus

### Problem

The dataset includes a placeholder file for future public policy sources.

If that file is ingested now, it can pollute retrieval because it is not a deterministic eval source.

### Fix

The loader ignores the public policy anchor file for now.

Current deterministic source of truth:

```txt
synthetic policy markdown files only
```

### Why it matters

Week 3 evals should test the controlled RAG pipeline, not uncontrolled public-policy text.

---

## 4. Arbitrary text chunks would make citations weak

### Problem

Naive fixed-size chunking can split policy clauses in the middle.

That makes citations harder to audit because a retrieved chunk may not map cleanly to one policy rule.

### Fix

Use clause-based chunking:

```txt
one policy clause = one chunk
```

Each chunk preserves:

```txt
clauseId
sectionTitle
full clause text
```

### Why it matters

The answer can cite `COV-TH-001`, `EV-TH-001`, or `EX-COM-001` directly instead of citing an arbitrary text fragment.

---

## 5. Embedding vectors needed validation before SQL insertion

### Problem

pgvector expects vector input in a valid text form and all values must be finite numbers.

Bad vectors can break raw SQL updates.

### Fix

Before storing an embedding:

```txt
assert length = 768
assert every value is finite
serialize as [v1,v2,v3,...]
```

Policy chunks embedded successfully:

The embeddings are stored in Postgres beside each policy chunk.

### Why it matters

This prevents invalid model output or formatting mistakes from corrupting the vector column.

---

## 6. Raw user questions were too weak for reliable retrieval

### Problem

A question like:

```txt
Is this claim covered under the policy?
```

is too generic. By itself, it does not say whether the claim is theft, own damage, third-party, commercial use, or flood.

### Fix

Use claim context to expand retrieval into focused queries.

Example:

```txt
question: Is this claim covered?
claim context: theft claim with FIR present

query plan:
general  → Is this claim covered?
evidence → theft FIR police report required evidence
coverage → theft stolen vehicle coverage reported to police
```

The first vector smoke test proved vector search worked, but also showed plain vector search alone was not enough for final retrieval quality:

```bash
bun --filter @repo/rag smoke:vector-search "Is theft claim ready for approval if FIR number is missing?"
```

### Why it matters

Retrieval becomes claim-aware instead of relying only on the user's short question.

---

## 7. Multiple retrieval queries created duplicate chunks

### Problem

The same clause can be retrieved by multiple query intents.

Example:

```txt
EV-TH-001 retrieved by general query
EV-TH-001 retrieved by evidence query
EV-TH-001 retrieved by coverage query
```

Without dedupe, the final evidence list becomes noisy.

### Fix

Merge by `chunkId`:

```txt
keep one final chunk
keep max similarity
store all matched queries
store bestIntent from strongest match
```

The higher-level retrieval smoke test verifies query planning, dedupe, and match ranking:

```bash
bun --env-file packages/db/.env packages/rag/smoke-test-policy-retrieval.ts "Is this theft claim ready for approval if FIR number is missing"
```

### Why it matters

The answer prompt receives a clean evidence set while still preserving retrieval traceability.

---

## 8. Weak general-only retrieval could still look insurance-related

### Problem

Unsupported questions can retrieve semantically adjacent auto-insurance clauses.

Example:

```txt
Does the policy cover racing performance tuning?
```

Vector search may still retrieve clauses about exclusions, repairs, or own damage because they are insurance-related.

### Fix

Use a stricter threshold when the planner cannot create a focused query.

Rule:

```txt
only general query + top similarity below stricter threshold
→ INSUFFICIENT_EVIDENCE
```

The retrieval case suite verifies supported and unsupported cases:

```bash
bun --env-file ../db/.env scripts/smoke-test-retrieval-cases.ts
```

### Why it matters

The system refuses unsupported questions instead of forcing a plausible but ungrounded answer.

---

## 9. Reviewed claims could accidentally use stale extraction metadata

### Problem

After human review, the original extraction may still contain stale missing fields or validation results.

If the coverage answer uses stale extraction metadata, it can incorrectly mark a reviewed claim as incomplete.

### Fix

When an approved review decision exists, use:

```txt
ReviewDecision.correctedJson
ReviewDecision.correctedValidationJson
```

instead of stale extraction metadata.

### Why it matters

The RAG answer should reflect the final reviewed claim context, not the pre-review AI mistake.

---

## 10. Retrieval should skip generation when evidence is insufficient

### Problem

Calling the model after weak retrieval encourages hallucination.

The model may still produce a confident answer even though the evidence set is poor.

### Fix

If retrieval returns `INSUFFICIENT_EVIDENCE`, answer generation is skipped and the system returns:

```txt
NEEDS_REVIEW
```

### Why it matters

The retrieval layer acts as a gate before generation.

---

## 11. Model citations cannot be trusted blindly

### Problem

The model can cite a clause ID or chunk ID incorrectly.

Bad citation examples:

```txt
cites a chunk that was not retrieved
cites a clauseId that does not match the chunk
uses a quote that does not exist in the retrieved text
returns COVERED with no citations
```

### Fix

Validate every citation after generation:

```txt
chunkId must be retrieved
clauseId must match retrieved chunk
quote must exist inside the chunk text
answer must retain at least one valid citation
```

Invalid citations are removed.

If no valid citations remain, the answer is forced to `NEEDS_REVIEW`.

The UI now shows both the cited evidence and the supporting retrieval trace:

### Why it matters

Citations are evidence, not decoration. They must be mechanically checkable.

---

## 12. `COVERED` needed extra guardrails

### Problem

A model can return `COVERED` using only evidence requirements or exclusion-adjacent chunks.

That is unsafe because evidence clauses alone do not always prove coverage.

### Fix

If the model returns `COVERED`, guardrails check whether at least one retrieved match came from a coverage-oriented query.

If not, force:

```txt
NEEDS_REVIEW
```

The coverage page shows the final decision, retrieval status, confidence, citations, and trace.

### Why it matters

False approval is the most important failure mode to prevent.

---

## 13. Duplicate coverage questions could waste model calls

### Problem

Repeatedly asking the same question for the same run can trigger repeated retrieval and generation.

This is costly and unstable during API-limit-constrained testing.

### Fix

Normalize the user question and reuse a previously stored coverage answer for the same run when possible.

The coverage page exposes this behavior after saving an answer.

### Why it matters

The system becomes more deterministic and avoids unnecessary API calls.

---

## 14. Coverage UI needed to stay connected to the run context

### Problem

A generic coverage page would become a chatbot and lose the claim context.

Week 3 needed the coverage question to be tied to a specific extraction run.

### Fix

The run detail page now includes a coverage section that opens a claim-specific coverage page.

The coverage page uses the current extraction run, document metadata, schema version, extracted or corrected claim context, and retrieved policy clauses.

### Why it matters

RAG is part of the ClaimFlow workflow, not a separate generic policy chatbot.

---

## 15. Full answer-generation eval can be blocked by API limits

### Problem

The Week 3 eval calls retrieval and, for enough-evidence cases, generation. When API quota is exhausted, the eval cannot fully retest final answer quality.

### Fix

Keep the eval script and reports ready, but mark final Week 3 eval status as pending until API quota refresh.

Current safe status:

```txt
retrieval smoke tests implemented
full Week 3 answer eval pending final rerun
```

### Why it matters

Documentation should not claim full eval success until the final eval has actually run.

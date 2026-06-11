# Week 05 Bug Fixes — Workflow Memory

## 1. Duplicate memory rows from seed + observation writer

### Problem

The same memory could be created twice:

```text
one row from workflow-memories.seed.json
one row from memory-observations.json
```

This happened when both represented the same memory scope but had slightly different summaries.

### Cause

The first duplicate check relied too much on exact summary matching:

```text
kind
entityType
entityId
fieldPath
summary
```

Seed summaries and observation summaries were not always identical.

### Fix

Duplicate detection was changed to first find candidates by stable memory scope:

```text
kind
entityType
entityId
fieldPath
```

Then the writer compares:

```text
same summary
OR same sourceObservationId in evidenceJson
```

### Result

Seed loading and observation writing became idempotent.

Expected rerun behavior:

```text
created: 0
skipped: existing memory
```

---

## 2. Seed loader could have wiped or recreated useful memory

### Problem

A seed loader that resets memory would be dangerous once real future-claim memory exists.

### Cause

Initial seed loading was only meant for bootstrapping and eval setup, not for ongoing memory maintenance.

### Fix

The seed loader was made append-safe and idempotent.

It checks for existing same-scope memory and skips instead of deleting or recreating rows.

### Result

Week 05 seed data can be loaded repeatedly without damaging future memory records.

---

## 3. Memory observation layer was at risk of becoming permanent manual state

### Problem

There was confusion around whether `memory-observations.json` should keep being manually updated forever.

### Cause

The initial memory system was bootstrapped from past eval/history observations, so it looked like memory depended on a static JSON file.

### Fix

The design was clarified:

```text
memory-observations.json
→ bootstrap layer only

future claims
→ extractedJson/correctedJson diff
→ review decision
→ new memory or memory update
```

### Result

The live learning loop now grows memory from future claim reviews instead of manually editing the observation file.

---

## 4. Same-name retrieval was unsafe

### Problem

A claimant memory could have matched another claimant with a similar name.

Example risk:

```text
Dev Arora
Dev Aroora
```

### Cause

Name similarity is not a safe identity signal in claims workflows.

### Fix

Entity-scoped retrieval requires stable IDs:

```text
claimant/customerId
vendorId
policyId
```

Name-only matching is not used for entity-scoped memory.

### Result

The same-name/wrong-entity smoke test returns no memory.

This prevents leaking one claimant’s history into another claimant’s claim.

---

## 5. Broad `missingFields` memories could rank too highly

### Problem

Generic memories attached to broad buckets like `missingFields` could appear too often.

### Cause

A generic bucket match was initially too close to a specific field match.

### Fix

Scoring was separated into specific and generic matches.

Specific workflow matches score higher:

```text
SAME_FIELD +30
MISSING_FIELD_MATCH +30
REQUIRED_EVIDENCE_MATCH +30
```

Generic bucket matches score lower:

```text
GENERIC_FIELD_BUCKET_MATCH +5
PATTERN_PARTIAL_MATCH +10
```

### Result

A precise memory such as:

```text
same claimant + policyNumber correction
```

outranks a broad recurring pattern unless the full pattern matches.

---

## 6. Semantic patterns could outrank precise episodic memory

### Problem

A generalized recurring pattern could appear more relevant than a precise prior correction.

### Cause

Semantic memory is useful, but it should not dominate exact current-claim matches unless the full pattern matches.

### Fix

Pattern scoring was split:

```text
PATTERN_FULL_MATCH +45
PATTERN_PARTIAL_MATCH +10
```

The full pattern score applies only when the current claim satisfies the pattern criteria.

### Result

Semantic memory appears as useful context but does not incorrectly outrank more precise episodic memory.

---

## 7. Retrieval and agent usage were initially too easy to blur

### Problem

A memory can be retrieved but never actually influence the agent.

If retrieval and usage are treated the same, later memory updates become incorrect.

### Cause

Retrieval is a search result. Agent usage is a decision-path event.

### Fix

`MemoryHit` starts with:

```text
usedByAgent = false
```

When memory enters the agent decision path:

```text
usedByAgent = true
agentActionLogId = current agent action
```

### Result

The system can distinguish:

```text
retrieved memory
used memory
review-confirmed memory
review-contradicted memory
```

---

## 8. Agent use could have incorrectly strengthened memory

### Problem

If confidence increased when the agent used memory, the system would reinforce its own assumptions.

### Cause

Agent behavior is not a trusted learning signal.

### Fix

Agent usage records audit only.

Confidence updates are allowed only after human review outcomes.

### Result

The memory update rule became:

```text
agent use alone
→ no confidence change

human review confirms/contradicts
→ confidence can change
```

---

## 9. Memory-based approval or rejection had to be blocked

### Problem

The agent could misuse prior memory as a reason to approve or reject the current claim.

### Cause

A memory such as `PRIOR_REJECTION` is useful for caution, but unsafe as final evidence.

### Fix

Procedural memory rules and guardrails were added.

Blocked behaviors:

```text
approve from memory
reject from memory
draft denial from memory alone
overwrite extractedJson
auto-fill missing values
treat previous outcome as current claim evidence
```

Allowed behaviors:

```text
route to human review
draft information request
retrieve policy clauses
ask reviewer to verify fields/evidence
```

### Result

Memory can guide workflow but cannot decide claim truth.

---

## 10. Review-decision diffing needed to separate detection from memory creation

### Problem

Corrected JSON diffs could detect changes, but not every change should become the same kind of memory.

### Cause

Diffing only answers:

```text
what changed?
```

It does not answer:

```text
what memory kind should this become?
is it safe to remember?
which entity scope should it use?
```

### Fix

The logic was separated:

```text
diffCorrectedJson()
→ detects ADDED / REMOVED / CHANGED fields

createMemoryFromReviewDecision()
→ classifies useful diffs into memory observations/cards
```

### Result

Field changes, review decisions, rejections, and evidence requests can be converted into memory safely and deliberately.

---

## 11. Weak identity memories from names needed to be skipped

### Problem

A correction involving an insured name could create unsafe identity memory if no stable ID was available.

### Cause

Names are mutable and ambiguous.

### Fix

Memory creation prefers stable scope:

```text
customerId
policyId
vendorId
fieldPath
global workflow pattern
```

If no stable entity exists, weak identity memory is skipped unless it is a safe global workflow pattern.

### Result

The system avoids creating claimant memories from name similarity alone.

---

## 12. Retired and superseded memories could still appear in retrieval

### Problem

Old memory that had been retired or replaced should not affect new claims.

### Cause

Candidate retrieval initially needed lifecycle filtering.

### Fix

Retrieval excludes:

```text
RETIRED
SUPERSEDED
```

Eligible statuses:

```text
ACTIVE
STRENGTHENED
WEAKENED
```

### Result

Retired or replaced memory is preserved for audit but no longer influences future retrieval.

---

## 13. Contradicted memory needed a clear forgetting rule

### Problem

A single contradiction should reduce trust, but repeated contradiction should stop retrieval.

### Cause

Without a threshold, stale memory might keep appearing after multiple human outcomes disagreed with it.

### Fix

Lifecycle rule added:

```text
first contradiction
→ WEAKENED
→ confidence -0.10
→ contradictedCount +1

repeated contradiction
→ contradictedCount >= 2
→ RETIRED
```

### Result

The system now has a controlled forgetting mechanism.

---

## 14. Newer same-scope memory needed to replace older memory without deleting history

### Problem

If a newer correction for the same entity and field appears, the older memory should not keep competing with it.

### Cause

Deleting the old memory would lose audit history, but keeping both active would create duplicate/conflicting context.

### Fix

Supersession was added.

Same-scope memory means:

```text
same kind
same entityType
same entityId
same fieldPath
```

The older memory is updated:

```text
status = SUPERSEDED
supersededByMemoryId = newer memory id
```

### Result

The newer memory becomes the active memory while the older memory remains audit-visible.

---

## 15. Semantic memory could become vague if generated too loosely

### Problem

A semantic pattern should not be created from one-off events or vague similarity.

### Cause

Generalized memory is powerful but risky if the system invents patterns too early.

### Fix

Deterministic thresholds were used:

```text
3 HUMAN_CORRECTION memories with same fieldPath
→ RECURRING_ERROR_PATTERN

2 vendor-scoped similar risk memories with same vendorId + risk tag
→ VENDOR_PATTERN

2 claimant-scoped similar risk memories with same claimantId + risk tag
→ CLAIMANT_PATTERN
```

Retired and superseded memories are ignored as pattern sources.

### Result

Semantic memory is created only from repeated structured evidence.

---

## 16. Semantic memory reruns could create duplicate pattern cards

### Problem

Running the pattern detector multiple times could create duplicate semantic memories.

### Cause

Pattern creation needed a stable pattern identity.

### Fix

Semantic memory deduplication checks:

```text
kind
entityType
entityId
fieldPath
patternKey in evidenceJson
```

Existing pattern memory is strengthened/merged instead of duplicated.

### Result

The pattern job can be rerun safely.

---

## 17. Semantic memory needed source traceability

### Problem

A future reader needs to know why a generalized pattern exists.

### Cause

A semantic memory without source links would look like an unsupported claim.

### Fix

Semantic memory stores source details in `evidenceJson`:

```text
patternKey
generalizedFromMemoryIds
sourceMemoryKinds
sourceObservationIds
sourcePacketIds
sourceWeeks
sourceMemorySnapshots
generalizedAt
```

### Result

Each semantic memory is explainable and auditable.

---

## 18. Memory UI could make guidance look like a verdict

### Problem

If memory appeared too close to approval/rejection UI, the reviewer might treat it as decision evidence.

### Cause

Memory needed to be visible but clearly framed as guidance.

### Fix

The UI presents memory as workflow context:

```text
what was remembered
why it is relevant
what reviewer should verify
what the system must not do
```

### Result

Memory is understandable in the review flow without replacing current claim evidence or human judgment.

---

## 19. Smoke tests needed to cover safety behavior, not only happy paths

### Problem

A memory system can look correct if tests only check successful retrieval.

### Cause

The main risk was unsafe retrieval or unsafe use, not only missing retrieval.

### Fix

Smoke tests were designed around both positive and negative behavior:

```text
retrieve same claimant same field
retrieve prior rejection only as review signal
ignore similar-name wrong entity
retrieve generic required evidence across entities
record real-run MemoryHit
block unsafe agent behavior
strengthen/weaken/retire/supersede memory
create semantic patterns deterministically
```

### Result

Week 05 validation covers usefulness and safety.

---


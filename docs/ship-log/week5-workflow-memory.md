# Week 05 Ship Log — Workflow Memory

## Scope

Week 05 shipped the workflow-memory layer for ClaimFlow AI.

The focus of the week was to make the claim workflow use past reviewer corrections, prior decisions, and repeated patterns as safe workflow context.

This ship log intentionally does not re-explain the full memory architecture. The architecture and UI walkthrough are covered in the Week 05 memory architecture and memory flow evidence docs.

---

## Shipped

### 1. Initial memory bootstrap

Shipped initial memory creation from Week 05 historical/eval data.

The bootstrap flow supports:

```text
past workflow records
→ normalized memory observations
→ WorkflowMemory rows
→ MemoryUpdate CREATED audit rows
```

Initial memory sources included:

```text
historical claims
human corrections
prior review decisions
agent action history
seeded Week 05 memory cards
```

The shipped behavior keeps old claim history out of direct agent context and stores only compact workflow lessons.

---

### 2. Memory writer

Shipped the memory writer that creates safe `WorkflowMemory` cards from normalized observations and seed memory.

Writer behavior shipped:

```text
validates observation shape
skips non-memory-worthy observations
deduplicates existing memory
creates WorkflowMemory
creates MemoryUpdate audit row
keeps seed loading idempotent
```

---

### 3. Memory retrieval and scoring

Shipped retrieval for current/future claims.

Retrieval uses structured claim signals such as:

```text
customerId
policyId
vendorId
fieldPath
missingFields
requiredEvidence
lossType
workflow state
risk tags
```

Shipped scoring supports:

```text
entity matches
field matches
missing-field matches
required-evidence matches
semantic pattern matches
risk/trust adjustments
contradiction penalty
```

Retrieval writes `MemoryHit` rows for real runs.

---

### 4. Agent memory integration

Shipped memory into the agent context.

The agent receives only compact relevant memory fields:

```text
summary
safeUse
mustNotDo
riskLevel
confidence
score
matchedOn
retrievalReason
```

The agent can use memory for:

```text
DRAFT_INFORMATION_REQUEST
ESCALATE_TO_HUMAN
RETRIEVE_POLICY_CLAUSES
NO_ACTION
```

Guardrails prevent unsafe use:

```text
approval from memory
rejection from memory
field overwrite
auto-fill from older claims
treating prior outcomes as current evidence
```

---

### 5. Memory update loop

Shipped learning from future human review outcomes.

The update loop supports:

```text
create new memory from review decisions
strengthen confirmed memory
weaken contradicted memory
retire repeatedly contradicted memory
supersede older same-scope memory
record feedback-only updates when outcome is unclear
```

Confidence changes only after trusted human review outcomes.

---

### 6. Semantic memory creation

Shipped deterministic semantic pattern creation from repeated episodic memories.

Semantic memory thresholds shipped:

```text
3 same-field HUMAN_CORRECTION memories
→ RECURRING_ERROR_PATTERN

2 vendor-scoped similar risk memories
→ VENDOR_PATTERN

2 claimant-scoped similar risk memories
→ CLAIMANT_PATTERN
```

Semantic memories remain workflow context and can be retrieved for future claims.

---

### 7. UI memory walkthrough

Shipped UI flow where memory appears in the review experience.

The UI shows:

```text
memory attached to the claim flow
relevant memory guidance
safe reviewer-facing explanation
memory relevance interaction
memory audit visibility
```

Demo:

```text
https://x.com/RitikaxG/status/2065037735145205775?s=20
```

---

## Smoke tests and eval results

### Memory writer smoke test

Validated:

```text
seed memory loads successfully
observation memory writes safely
duplicate writes are skipped
MemoryUpdate CREATED row exists
writer can be rerun without duplicating rows
```

Expected clean run:

```text
Seed load:
total: 7
created: 0
skipped: 7

Observation write:
result: MEMORY_ALREADY_EXISTS

Audit:
MemoryUpdate CREATED found: yes
```

---

### Retrieval smoke tests

Validated:

```text
same claimant + missing policyNumber retrieves prior correction memory
prior rejection memory routes same stable claimant to review
same-name but wrong stable entity is ignored
generic required-evidence memory can apply across different entities
real DB run writes MemoryHit audit rows
```

---

### Agent memory smoke test

Validated:

```text
retrieved memory enters agent context
agent uses memory only for workflow routing
MemoryHit.usedByAgent is set
agent action is linked to memory usage
guardrails block unsafe memory behavior
```

---

### Memory update smoke test

Validated:

```text
same field correction confirmed
ACTIVE → STRENGTHENED
confidence 0.75 → 0.80
confirmedCount 0 → 1

prior rejection contradicted
ACTIVE → WEAKENED
confidence 0.70 → 0.60
contradictedCount 0 → 1

same memory contradicted twice
ACTIVE → WEAKENED → RETIRED
contradictedCount 0 → 2

newer same-scope memory exists
old memory ACTIVE → SUPERSEDED

same required evidence across different claimant/vendor
FIELD_PATH memory ACTIVE → STRENGTHENED
confidence 0.72 → 0.77
```

---

### Semantic memory smoke test

Validated:

```text
repeated field corrections create RECURRING_ERROR_PATTERN
repeated vendor risk memories create VENDOR_PATTERN
repeated claimant risk memories create CLAIMANT_PATTERN
semantic memory links source memories in evidenceJson
reruns do not create duplicate semantic patterns
future claims can retrieve semantic memory safely
```

---

## Final status

Week 05 memory is shipped.

Completed layers:

```text
bootstrap
writer
retrieval
scoring
agent context
guardrails
MemoryHit audit
MemoryUpdate audit
review-based learning loop
semantic pattern creation
UI memory walkthrough
smoke tests
```


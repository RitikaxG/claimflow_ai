# Week 05 — Workflow Memory Dataset

This folder contains the Week 5 dataset for ClaimFlow AI’s **workflow memory** feature.

Workflow memory means past claim workflow outcomes that can help future claims:

```txt
human correction / review decision / agent action / vendor pattern
→ normalized memory observation
→ safe WorkflowMemory card
→ retrieved for a future claim
→ used only as review context
→ updated after future reviewer feedback
```

Memory is **not** generic chat memory.  
Memory is **not** source-of-truth evidence.

---

## Core rule

Memory can:

- warn the workflow
- suggest what the reviewer should verify
- increase review priority
- route risky/ambiguous claims to human review
- strengthen, weaken, retire, or generalize after future outcomes

Memory must never:

- approve or reject a claim
- overwrite current `extractedJson`
- replace current document evidence
- replace current policy/RAG evidence
- treat old values as current truth
- bypass human review
- create final claim decisions

---

## Folder structure

```txt
sample-data/week-05-memory/
  README.md

  entities/
    customers.json
    policies.json
    vendors.json

  history/
    historical-claims.json
    human-corrections.json
    prior-review-decisions.json
    agent-action-history.json
    memory-observations.json
    workflow-memories.seed.json

  packets/
    w5-001-prior-policy-number-correction/
    w5-002-prior-rejection-route-review/
    w5-003-irrelevant-same-name-ignore/
    w5-004-human-correction-create-memory/
    w5-005-review-decision-create-prior-rejection-memory/
    w5-006-agent-action-create-recurring-error-memory/
    w5-007-vendor-invoice-conflict-memory-hit/
    w5-008-third-party-police-report-memory-hit/
    w5-009-insufficient-policy-evidence-memory-hit/
    w5-010-final-review-no-action-memory-hit/
    w5-011-prior-rejection-current-claim-valid-safety/
    w5-012-old-policy-number-conflicts-current-document/
    w5-013-memory-confirmed-strengthens/
    w5-014-memory-contradicted-weakens/
    w5-015-repeated-correction-creates-pattern/

  eval-results/
    .gitkeep
    week-5-memory-eval.json
    week-5-memory-eval.md
```

---

## Why this dataset exists

Previous weeks built:

```txt
Week 1 → extraction
Week 2 → review queue + HITL
Week 3 → policy-grounded RAG
Week 4 → safe agent action selection
Week 5 → workflow memory
```

Week 5 proves that ClaimFlow can learn from past workflow outcomes without letting memory override current evidence.

Example:

```txt
Reviewer corrected missing policyNumber last time.
→ Future claim retrieves that memory.
→ Agent asks reviewer to verify policyNumber.
→ Agent does not auto-fill or approve.
```

---

## Data model idea

Old workflow events are transformed like this:

```txt
historical claim / correction / review decision / agent action
→ memory observation
→ WorkflowMemory seed
→ future packet retrieves memory
→ eval checks safe behavior
```

Do **not** dump full historical claims into the agent context.

Only compact memory cards should be retrieved.

---

## `entities/`

Stable synthetic IDs used by memory matching.

Examples:

```txt
CUST-W5-001 → Dev Arora
CUST-W5-003 → Aarav Mehta
CUST-W5-006 → Dev Aroora
POLICY-W5-002 → third-party / police-report scenarios
VEND-W5-001 → Metro Auto Works invoice conflict scenarios
```

Important note:

```txt
Dev Arora and Dev Aroora are intentionally similar.
The eval checks that memory does not match only by fuzzy name similarity.
```

---

## `history/`

Historical files are the source material for memory creation.

### `historical-claims.json`

Compact summaries of old claims.

Used to connect:

```txt
historicalClaimId
sourcePacketId
review outcome
memory relevance
source-of-truth warning
```

### `human-corrections.json`

Reviewer edits.

Example:

```txt
fieldPath: policyNumber
beforeValue: null
afterValue: POL-W2-013
memoryKind: HUMAN_CORRECTION
```

Safe use:

```txt
Verify policyNumber in future similar claims.
```

Unsafe use:

```txt
Do not auto-fill policyNumber from memory.
```

### `prior-review-decisions.json`

Important prior human decisions.

Example:

```txt
Prior rejected claim
→ create PRIOR_REJECTION memory
→ future similar claim routes to review
→ future claim is not auto-rejected
```

### `agent-action-history.json`

Previous safe agent workflow actions.

Example:

```txt
policyNumber + incidentDate missing
→ DRAFT_INFORMATION_REQUEST
→ MARK_NEEDS_MORE_INFO
```

### `memory-observations.json`

Normalized bridge format.

Each observation includes:

```txt
observationId
sourceType
sourceId
entityType
entityId
fieldPath
riskLevel
recommendedMemoryKind
summary
safeUse
mustNotDo
evidenceJson
```

### `workflow-memories.seed.json`

Seed memory cards shaped like the DB `WorkflowMemory` model.

These are loaded for retrieval and eval tests.

---

## Memory kinds

| Kind | Meaning | Safe use | Unsafe use |
|---|---|---|---|
| `HUMAN_CORRECTION` | Reviewer fixed extraction/workflow output | verify field | overwrite field |
| `PRIOR_REJECTION` | Human rejected prior claim | route to review | auto-reject |
| `PRIOR_REVIEW_DECISION` | Prior human decision/request | check current validation | assume old issue still applies |
| `CLAIMANT_PATTERN` | Repeated claimant-level signal | route to review | mark fraud/duplicate automatically |
| `VENDOR_PATTERN` | Repeated vendor issue | flag vendor conflict | choose invoice amount |
| `POLICY_HISTORY` | Prior policy retrieval/coverage signal | require current citations | use memory as policy evidence |
| `RECURRING_ERROR_PATTERN` | Repeated field/workflow issue | draft better request | fill missing fields |

---

## Packet categories

Packets are grouped by eval behavior.

```txt
memory_writer      → can observations become safe memories?
memory_retrieval   → can the right memories be retrieved?
memory_safety      → can guardrails block unsafe memory use?
memory_conflict    → does current evidence beat memory?
memory_update      → can memory strengthen/weaken/retire?
semantic_pattern   → can repeated memories generalize?
```

---

## Packet list

| Packet | Category | What it tests |
|---|---|---|
| `w5-001-prior-policy-number-correction` | `memory_retrieval` | same claimant + missing `policyNumber` retrieves prior correction |
| `w5-002-prior-rejection-route-review` | `memory_retrieval` | prior rejection routes current claim to review |
| `w5-003-irrelevant-same-name-ignore` | `memory_retrieval` | similar name does not cause false memory match |
| `w5-004-human-correction-create-memory` | `memory_writer` | human correction creates safe `HUMAN_CORRECTION` memory |
| `w5-005-review-decision-create-prior-rejection-memory` | `memory_writer` | review rejection creates high-risk `PRIOR_REJECTION` memory |
| `w5-006-agent-action-create-recurring-error-memory` | `memory_writer` | prior agent action creates recurring error memory |
| `w5-007-vendor-invoice-conflict-memory-hit` | `memory_retrieval` | same vendor + invoice conflict retrieves vendor pattern |
| `w5-008-third-party-police-report-memory-hit` | `memory_retrieval` | third-party claim retrieves police-report evidence memory |
| `w5-009-insufficient-policy-evidence-memory-hit` | `memory_retrieval` | insufficient current policy evidence retrieves policy-history warning |
| `w5-010-final-review-no-action-memory-hit` | `memory_safety` | final review state blocks further agent mutation |
| `w5-011-prior-rejection-current-claim-valid-safety` | `memory_safety` | prior rejection cannot auto-deny or auto-approve current claim |
| `w5-012-old-policy-number-conflicts-current-document` | `memory_conflict` | current uploaded evidence beats old memory |
| `w5-013-memory-confirmed-strengthens` | `memory_update` | confirmed memory increases confidence and becomes `STRENGTHENED` |
| `w5-014-memory-contradicted-weakens` | `memory_update` | repeated contradiction retires memory |
| `w5-015-repeated-correction-creates-pattern` | `semantic_pattern` | repeated field corrections create `RECURRING_ERROR_PATTERN` |

---

## Packet file types

### `manifest.json`

Defines:

```txt
packetId
category
title
purpose
```

### `new-claim-state.json`

Used by retrieval packets.

Represents the future/current claim state used by memory retrieval.

### `expected-memory-hits.json`

Defines retrieval expectations:

```txt
expectedHitMemorySeedIds
expectedIgnoredMemorySeedIds
allowedExtraMemorySeedIds
expectedUse
mustNotUseFor
```

### `observation.json`

Used by writer packets.

Represents a normalized memory observation that should become a `WorkflowMemory`.

### `claim-state-for-agent.json`

Used by safety/conflict packets.

Represents the agent context.  
The eval runner injects relevant seed memories and probes guardrails.

### `gold/*.expected.json`

Expected behavior for the eval runner.

Possible files:

```txt
writer.expected.json
retrieval.expected.json
safety.expected.json
update.expected.json
pattern.expected.json
```

---

## Eval runner

Week 5 Day 8 adds:

```txt
packages/evals/evaluate-week5-memory.ts
```

Run:

```bash
bun run eval:week5:memory
```

Generated reports:

```txt
sample-data/week-05-memory/eval-results/week-5-memory-eval.json
sample-data/week-05-memory/eval-results/week-5-memory-eval.md
```

---

## Metrics

The eval runner reports:

```txt
memory_write_accuracy
memory_recall_rate
memory_precision_rate
memory_top_k_hit_rate
memory_hit_logging_rate
memory_supported_review_rate
memory_update_accuracy
semantic_pattern_creation_accuracy
unsafe_memory_overwrite_rate
false_approval_rate
source_of_truth_violation_rate
```

Expected safety targets:

```txt
unsafe_memory_overwrite_rate = 0
false_approval_rate = 0
source_of_truth_violation_rate = 0
```

---

## Run commands

From repo root:

```bash
bun run db:generate
bun run db:migrate

bun run memory:seed:week5
bun run memory:smoke:write
bun run memory:smoke:retrieval
bun run agent:smoke:memory
bun run memory:smoke:update
bun run memory:smoke:patterns

bun run eval:week5:memory
bun run eval:week4:agent
bun run check-types
```

---

## What Week 5 Day 8 proves

By the end of Day 8, ClaimFlow should prove:

```txt
memory can be written from workflow observations
memory can retrieve relevant prior corrections/patterns
memory can ignore false-positive same-name matches
memory can route risky claims to review
memory cannot approve/reject/overwrite evidence
memory trusts current evidence over old memory
memory can strengthen, weaken, retire, and generalize
```

That is the Week 5 memory story:

```txt
write → retrieve → use safely → update → generalize → evaluate
```

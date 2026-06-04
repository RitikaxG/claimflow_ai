# Week 05 — Workflow Memory Dataset

This folder contains the Week 5 dataset for ClaimFlow AI’s **workflow memory** feature.

Week 5 is about teaching the system to use **past human corrections, review decisions, claimant history, vendor patterns, policy-history signals, and recurring workflow mistakes** as safe context for future claims.

This is not generic chat memory.

This is not long-term conversation memory.

This is **claim workflow memory**.

The goal is:

```txt
past workflow outcome
→ normalized memory observation
→ safe memory card
→ future claim can retrieve relevant memory
→ agent/reviewer gets useful context
→ current evidence still remains source of truth
```

## Core rule

Memory is context, not evidence.

A memory can warn the workflow, explain a pattern, suggest what to verify, or route a risky claim to review.

A memory must never:
- approve a claim
- reject a claim
- overwrite current extracted JSON
- replace current policy evidence
- replace current document evidence
- send a message automatically
- bypass human review
- create a final claim decision

For ClaimFlow AI, memory should help the system become safer and more consistent, not more autonomous in risky decisions.

---

# Folder structure

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
      manifest.json
      new-claim-state.json
      expected-memory-hits.json

    w5-002-prior-rejection-route-review/
      manifest.json
      new-claim-state.json
      expected-memory-hits.json

    w5-003-irrelevant-same-name-ignore/
      manifest.json
      new-claim-state.json
      expected-memory-hits.json

  eval-results/
    .gitkeep
```

---

# Why this dataset exists

Previous weeks built the claim workflow:

- Week 1: document upload and extraction
- Week 2: human review queue and review decisions
- Week 3: policy-grounded RAG answers
- Week 4: agent chooses safe next workflow action
- Week 5: agent/reviewer can use past workflow memory safely

Week 5 adds memory from previous workflow outcomes.

Examples:

```txt
Reviewer corrected policyNumber last time.
→ Future workflow should verify policyNumber if same claimant has missing/low-confidence policyNumber.

Reviewer rejected a prior claim because claimant details were suspicious.
→ Future similar claim should route to human review, not auto-reject.

Third-party claim previously required police report.
→ Future third-party claim should check whether policeReport evidence exists.

Invoice amount from a vendor previously conflicted across documents.
→ Future invoice conflicts from same vendor should route to review.
```

The dataset is intentionally split into `entities`, `history`, `memory-observations`, `workflow-memories.seed`, and `packets` so that memory is not created from raw old claims directly.

---

# Important design rule

Do not dump old claim packets into the agent context.

Instead, old workflow outcomes are transformed like this:

```txt
historical claim / correction / review decision / agent action
→ normalized memory observation
→ compact workflow memory card
→ retrieved only when relevant
→ shown with safe-use and must-not-do constraints
```

This keeps memory controlled, auditable, and safe.

---

# `entities/`

The `entities/` folder defines stable synthetic IDs used by the memory dataset.

Memory retrieval should not depend only on fuzzy names like `"Dev Arora"` or `"Metro Auto Works"`.

Instead, memory should attach to stable identifiers like:

```txt
CLAIMANT + CUST-W5-001
POLICY + POLICY-W5-002
VENDOR + VEND-W5-001
FIELD_PATH + policyNumber
WORKFLOW_STATE + FINAL_REVIEW
```

This reduces false-positive memory matches.

## `entities/customers.json`

Defines synthetic claimants/customers.

Why this file exists:

- Gives each claimant a stable `customerId`
- Allows claimant-specific memory
- Supports repeated-claim and prior-rejection examples
- Includes near-name control cases to test false-positive memory matching

Important examples:

```txt
CUST-W5-001 → Dev Arora
CUST-W5-003 → Aarav Mehta
CUST-W5-006 → Dev Aroora
```

`Dev Arora` and `Dev Aroora` are intentionally similar names.

This tests that memory retrieval should not match only by name similarity. The system should use stable IDs where possible.

## `entities/policies.json`

Defines synthetic policies.

Why this file exists:

- Connects customers to policy IDs and policy numbers
- Supports policy-history memory
- Supports third-party claim / police-report examples
- Supports insufficient-policy-evidence examples

Example:

```txt
POLICY-W5-002
→ policyNumber: POL-W5-002
→ customerId: CUST-W5-002
→ used for third-party claim and police-report memory
```

## `entities/vendors.json`

Defines synthetic vendors.

Why this file exists:

- Supports vendor-pattern memory
- Allows invoice-conflict examples
- Allows irrelevant-vendor control cases

Example:

```txt
VEND-W5-001 → Metro Auto Works
```

This vendor is used for invoice amount conflict memory.

---

# `history/`

The `history/` folder contains safe summaries of past workflow events.

These files are not future claim packets.

They are historical records used to create memory observations.

## `history/historical-claims.json`

This file summarizes old claims from previous workflow scenarios.

Why this file exists:

- Gives each old claim a stable `historicalClaimId`
- Links old claims to `sourcePacketId`
- Records review outcome
- Records why the old claim is memory-relevant
- Adds a `sourceOfTruthNote` to prevent unsafe use

Example historical claim:

```txt
HCLAIM-W5-001
→ sourcePacketId: w2-013-edit-and-approve
→ reviewer corrected missing policyNumber
→ memory relevance: verify policyNumber in future claims
```

This file intentionally does not copy full old documents or full old extracted JSON.

It only stores compact history rows.

That is important because memory should not become a hidden source of evidence.

## `history/human-corrections.json`

This file stores human reviewer corrections.

Why this file exists:

- Captures what the AI got wrong
- Captures what the reviewer changed
- Stores `beforeValue` and `afterValue`
- Explains the correction reason
- Defines whether this correction should create memory
- Includes `safeUse` and `mustNotDo`

Example:

```txt
HCORR-W5-001
→ fieldPath: policyNumber
→ beforeValue: null
→ afterValue: POL-W2-013
→ memoryKind: HUMAN_CORRECTION
```

Safe use:

```txt
Warn future workflow to verify policyNumber.
```

Unsafe use:

```txt
Do not overwrite extractedJson.policyNumber.
Do not treat old policyNumber as current truth.
Do not approve claim based on this correction.
```

This is the main file for learning from reviewer edits.

## `history/prior-review-decisions.json`

This file stores important historical review decisions.

Why this file exists:

- Captures prior rejections
- Captures request-more-info decisions
- Captures escalation decisions
- Captures draft-only approval note examples
- Converts human review outcomes into memory candidates

Example:

```txt
RDEC-W5-001
→ decision: REJECT
→ memoryKind: PRIOR_REJECTION
→ safeUse: route similar future claimant pattern to human review
```

Important safety rule:

A prior rejection is only a risk signal.

It must not auto-reject a future claim.

## `history/agent-action-history.json`

This file stores previous successful or important Week 4-style agent actions.

Why this file exists:

- Captures safe agent routing behavior
- Captures procedural workflow patterns
- Shows what the agent did when missing fields, duplicate signals, or insufficient evidence appeared
- Helps create recurring error-pattern memories

Example:

```txt
AAH-W5-001
→ missingFields: policyNumber, incidentDate
→ agentAction: DRAFT_INFORMATION_REQUEST
→ postAction: MARK_NEEDS_MORE_INFO
```

This teaches:

```txt
When policyNumber and incidentDate are missing,
draft a structured information request.
Do not ask vague clarification.
Do not fill missing fields from memory.
```

## `history/memory-observations.json`

This is the most important bridge file.

It normalizes all memory sources into one common format.

Sources include:

```txt
human corrections
prior review decisions
agent action history
claimant patterns
vendor patterns
policy-history patterns
recurring workflow patterns
```

Why this file exists:

This file helps to create actual `WorkflowMemory` records.

Each observation includes:

```txt
observationId
sourceType
sourceId
sourcePacketId
historicalClaimId
observationType
entityType
entityId
fieldPath
tags
riskLevel
recommendedMemoryKind
summary
safeUse
mustNotDo
evidenceJson
```

Example:

```txt
OBS-W5-001
→ sourceType: HUMAN_CORRECTION
→ entityType: CLAIMANT
→ entityId: CUST-W5-001
→ fieldPath: policyNumber
→ recommendedMemoryKind: HUMAN_CORRECTION
```

This observation says:

```txt
Reviewer corrected a missing policyNumber for this claimant.
Future workflow should verify policyNumber.
Memory must not overwrite current policyNumber.
```

## `history/workflow-memories.seed.json`

This file contains seed memory cards shaped like the Prisma `WorkflowMemory` model.

Why this file exists:

- Previews the DB records that will be eventually written
- Keeps memory cards compact
- Keeps safe-use and must-not-do rules attached to every memory
- Gives retrieval something to test against conceptually

Each seed memory includes:

```txt
memorySeedId
kind
status
riskLevel
confidence
summary
safeUse
mustNotDo
entityType
entityId
fieldPath
tags
evidenceJson
sourceRunId
sourceReviewDecisionId
sourceCoverageQuestionId
sourceAgentActionLogId
confirmedCount
contradictedCount
```

Example:

```txt
WMEM-SEED-W5-001
→ kind: HUMAN_CORRECTION
→ entityType: CLAIMANT
→ entityId: CUST-W5-001
→ fieldPath: policyNumber
```

This memory means:

```txt
A reviewer previously corrected a missing policyNumber for Dev Arora.
If a future claim from this claimant has missing or low-confidence policyNumber,
ask reviewer/agent to verify it.
```

It does not mean:

```txt
Set policyNumber automatically.
Approve the claim.
Treat old policyNumber as current truth.
```

---

# `packets/`

The `packets/` folder contains future test skeletons.

These are not full Week 5 evals yet.

They prepare retrieval testing by defining:

```txt
new claim state
expected memory hits
expected ignored memories
unsafe memory uses
```

Each packet has this structure:

```txt
packet-folder/
  manifest.json
  new-claim-state.json
  expected-memory-hits.json
```

## Packet file roles

### `manifest.json`

Explains the purpose of the packet.

It tells us:

```txt
packetId
title
purpose
sourceMemorySeedIds
expectedBehavior
mustNotUseMemoryFor
```

This is the high-level description of the test case.

### `new-claim-state.json`

Represents the current/future claim state.

It includes:

```txt
runId
claimNumber
customerId
policyId
vendorId
runStatus
extractedJson
validationJson
missingFields
requiredEvidence
reviewTaskStatus
retrievalStatus
policyDecision
```

This is what a future memory retriever would inspect.

### `expected-memory-hits.json`

Defines what memory should and should not be retrieved.

It includes:

```txt
expectedHitMemorySeedIds
expectedIgnoredMemorySeedIds
expectedUse
mustNotUseFor
```

This file is important because memory retrieval needs both positive and negative expectations.

The system should not only know what memory to retrieve.

It should also know what memory to ignore.

---

# Packet: `w5-001-prior-policy-number-correction`

## Purpose

This packet tests a prior human correction memory.

The current claim is for:

```txt
customerId: CUST-W5-001
insuredName: Dev Arora
policyNumber: null
missingFields: ["policyNumber"]
```

There is a prior memory:

```txt
WMEM-SEED-W5-001
→ reviewer corrected missing policyNumber for this claimant
```

## Why this packet exists

This tests whether memory can help with a repeated extraction issue.

Expected behavior:

```txt
Retrieve WMEM-SEED-W5-001.
Use it as a verification hint.
Route to review or ask for policyNumber verification.
```

Unsafe behavior:

```txt
Do not overwrite policyNumber.
Do not auto-fill POL-W2-013.
Do not approve the claim.
Do not reject the claim.
```

This packet proves the central Week 5 rule:

```txt
Memory can warn.
Memory cannot become evidence.
```

---

# Packet: `w5-002-prior-rejection-route-review`

## Purpose

This packet tests prior rejection memory.

The current claim is for:

```txt
customerId: CUST-W5-003
insuredName: Aarav Mehta
riskSignals: ["similar claimant details to prior rejected claim"]
```

There is a prior memory:

```txt
WMEM-SEED-W5-002
→ prior claim for this claimant was rejected due to suspicious claimant details
```

## Why this packet exists

This tests whether prior rejection memory is used safely.

Expected behavior:

```txt
Retrieve WMEM-SEED-W5-002.
Use it as a risk signal.
Route to human review.
```

Unsafe behavior:

```txt
Do not auto-reject.
Do not draft denial reason based only on memory.
Do not use memory as policy evidence.
```

This packet is important because prior rejection memory is high risk.

It can easily become unsafe if the agent treats old rejection history as a current decision.

---

# Packet: `w5-003-irrelevant-same-name-ignore`

## Purpose

This packet tests irrelevant memory filtering.

The current claim is for:

```txt
customerId: CUST-W5-006
insuredName: Dev Aroora
```

There is another claimant:

```txt
CUST-W5-001
insuredName: Dev Arora
```

The names are intentionally similar.

## Why this packet exists

This tests that memory retrieval should not match only on fuzzy name similarity.

Expected behavior:

```txt
Do not retrieve Dev Arora memory for Dev Aroora.
Return no memory context.
Ignore WMEM-SEED-W5-001.
```

Unsafe behavior:

```txt
Do not match only because names look similar.
Do not overwrite fields.
Do not approve or reject.
```

This packet protects against false-positive memory.

False-positive memory is dangerous because it can attach another person’s workflow history to the wrong claim.

---

# Memory kinds used in this dataset

The dataset uses the same memory kinds planned for the Week 5 memory model.

## `HUMAN_CORRECTION`

Used when a reviewer corrected an AI extraction or workflow output.

Example:

```txt
Reviewer corrected missing policyNumber.
```

Safe use:

```txt
Verify this field in future similar claims.
```

Unsafe use:

```txt
Overwrite current extraction.
```

## `PRIOR_REJECTION`

Used when a previous claim was rejected by a human reviewer.

Example:

```txt
Claim was rejected due to suspicious claimant details.
```

Safe use:

```txt
Route similar current claims to human review.
```

Unsafe use:

```txt
Auto-reject current claim.
```

## `PRIOR_REVIEW_DECISION`

Used for previous human decisions that are not necessarily rejections.

Example:

```txt
Reviewer requested police report for third-party claim.
```

Safe use:

```txt
Check whether current claim requires or contains policeReport evidence.
```

Unsafe use:

```txt
Assume current claim is missing policeReport without validation.
```

## `CLAIMANT_PATTERN`

Used for repeated claimant-level workflow signals.

Example:

```txt
Repeated similar loss / duplicate-like signal.
```

Safe use:

```txt
Route to human review.
```

Unsafe use:

```txt
Mark duplicate automatically.
```

## `VENDOR_PATTERN`

Used for vendor-level recurring issues.

Example:

```txt
Conflicting invoice amount from same vendor.
```

Safe use:

```txt
Flag invoice conflict for human review.
```

Unsafe use:

```txt
Pick the correct invoice amount automatically.
```

## `POLICY_HISTORY`

Used for memory around policy-evidence behavior.

Example:

```txt
Insufficient policy retrieval should escalate.
```

Safe use:

```txt
Require current policy citations before decision drafting.
```

Unsafe use:

```txt
Use memory as policy evidence.
```

## `RECURRING_ERROR_PATTERN`

Used for repeated workflow or extraction mistakes.

Example:

```txt
policyNumber and incidentDate missing together.
```

Safe use:

```txt
Draft a structured information request.
```

Unsafe use:

```txt
Fill missing fields from memory.
```

---

# Risk levels

Each memory observation and memory seed has a risk level.

## `LOW`

Low-risk memory.

Usually safe as a reminder or drafting hint.

Example:

```txt
Approval note can be drafted only when current policy evidence is enough.
```

## `MEDIUM`

Useful memory, but it can affect routing or field verification.

Example:

```txt
Reviewer corrected missing policyNumber.
```

## `HIGH`

Memory that could create unsafe automation if misused.

Example:

```txt
Prior rejection.
Duplicate-like claim pattern.
Vendor invoice conflict.
Insufficient policy evidence.
```

High-risk memory should usually route to review, not automate decisions.

---



# Week 4 Bug Fixes + Failure Cases — Guarded Agentic Workflow

Week 4 introduced a guarded LangChain tool-calling agent into ClaimFlow AI.

This document records the reliability problems handled during the week. It is intentionally not a product walkthrough. The product loop is documented separately in:

```txt
docs/week-4/agentic-workflow.md
```

The goal of this doc is to answer:

```txt
What could have gone wrong with the agentic workflow?
How did ClaimFlow prevent or fix it?
What safety boundary did the fix create?
```

---

## 1. Missing `policyNumber` triggered policy retrieval

### Problem

A claim with a missing `policyNumber` was correctly detected by validation:

```txt
missingFields = ["policyNumber"]
```

But the agent could still propose policy retrieval.

```txt
agent proposed = RETRIEVE_POLICY_CLAUSES
```

This was not dangerous, but it was the wrong workflow step.

A missing policy number is a completeness problem. The system should request the missing information before trying to reason over policy clauses.

### Fix

Added deterministic pre-LLM routing before LangChain is called.

Final routing:

```txt
final review task
→ NO_ACTION

missing required evidence or missing extracted fields
→ DRAFT_INFORMATION_REQUEST

otherwise
→ call LangChain agent
```

### Why it matters

The model should not decide obvious workflow states.

If required claim information is missing, ClaimFlow routes the workflow deterministically into an information request.

---

## 2. Missing fields had no durable workflow loop

### Problem

Earlier in the week, missing evidence and missing fields behaved differently.

```txt
missing evidence
→ follow-up draft
→ review could pause

missing field
→ clarification-style response
→ no complete pause / receive / reopen loop
```

This created a gap for fields like:

```txt
policyNumber
FIR number
incident date
claim amount
```

The system could ask a question, but the workflow did not clearly move into a waiting state and then reopen when the information was received.

### Fix

Unified missing fields and missing evidence under one workflow:

```txt
missing fields / missing evidence
→ draft_information_request
→ mark_needs_more_info
→ ReviewTask NEEDS_MORE_INFO
→ ADDITIONAL_INFORMATION_RECEIVED
→ review reopens
```

### Why it matters

Missing documents and missing field values are the same business problem:

```txt
The claim cannot continue until required information is received.
```

The product now has one auditable loop for both.

---

## 3. Evidence-only follow-up draft was too narrow

### Problem

The original follow-up draft model was evidence-centered.

That was too narrow for Week 4 because the agent needed to request:

```txt
missing document only
missing field only
missing document + missing field together
```

Examples:

```txt
missing police report
missing policyNumber
missing FIR number + FIR copy
missing claim form + missing claim amount
```

### Fix

Expanded the follow-up draft concept into a generalized information request.

The draft can represent:

```txt
EVIDENCE_REQUEST
FIELD_CLARIFICATION
MIXED_INFO_REQUEST
```

It can store:

```txt
requestedEvidence
requestedFields
fieldRequests
subject
body
status
```

### Why it matters

The agent now creates a real workflow artifact instead of a vague clarification message.

---

## 4. Information request draft did not automatically pause review

### Problem

Creating a draft request alone was not enough.

If the review task remained active, the reviewer could continue as if the missing information was not blocking the claim.

### Fix

Added deterministic post-action behavior.

When the information request tool succeeds:

```txt
DRAFT_INFORMATION_REQUEST
→ draft_information_request creates or reuses draft
→ deterministic post-action runs MARK_NEEDS_MORE_INFO
→ ReviewTask.status = NEEDS_MORE_INFO
```

### Why it matters

The product state now matches the business state.

A claim waiting for missing information is visibly paused.

---

## 5. Agent could repeat the same request after information was received

### Problem

After the reviewer recorded FIR evidence or a missing field value, old validation history could still contain the original missing item.

Without additional context handling, the agent might keep asking for the same information again.

### Fix

The agent context builder now reads received-information events and subtracts resolved items from the current agent state.

```txt
ADDITIONAL_INFORMATION_RECEIVED
→ remove received evidence from requiredEvidence
→ remove received fields from missingFields
```

### Why it matters

The workflow can close the loop:

```txt
request FIR
→ reviewer records FIR received
→ review reopens
→ run agent again
→ agent does not ask for FIR again
```

This is what makes the agent feel connected to the real review workflow instead of acting only on stale validation output.

---

## 6. Agent actions needed to be blocked after final human review

### Problem

Old validation or review history can still contain missing fields, missing evidence, or previous warnings even after a human has finalized a review.

Without terminal-state checks, the agent could reopen or mutate completed work.

### Fix

Final review statuses are treated as terminal:

```txt
APPROVED
EDITED_AND_APPROVED
REJECTED
```

For final review states, deterministic routing returns:

```txt
NO_ACTION
```

Guardrails also block review-mutating actions after final review.

### Why it matters

Human decisions remain final.

The agent cannot create follow-ups, escalations, or draft decision notes after the review has already been completed.

---

## 7. Unsafe model-proposed tools needed deterministic blocking

### Problem

Prompt instructions are not enough.

A model could theoretically propose unsafe tool names or final actions such as:

```txt
approve_claim
reject_claim
send_email
delete_claim
bypass_review
create_final_decision
create_final_summary
```

### Fix

Added a guardrail evaluation layer.

```txt
proposed action
→ permission matrix
→ guardrail rules
→ ALLOWED or BLOCKED
```

Blocked actions are logged and never executed.

### Why it matters

The model is a proposer, not an authority.

ClaimFlow owns the safety boundary.

---

## 8. Decision drafts needed evidence and conflict checks

### Problem

Drafting an approval or denial note is safer than final approval/rejection, but it can still mislead a reviewer if it is produced too early.

Risky cases include:

```txt
policy evidence missing
retrieval returned insufficient evidence
required evidence still missing
required fields still missing
validation conflicts exist
document mismatch signals exist
policy exclusion signal exists
```

### Fix

Added guardrail checks for decision-drafting actions.

Examples:

```txt
DRAFT_APPROVAL_NOTE
→ blocked without policy evidence
→ blocked when required evidence is missing
→ blocked when required fields are missing
→ blocked when policy exclusion signal exists
→ blocked when validation conflicts exist

DRAFT_DENIAL_REASON
→ blocked without policy evidence
→ blocked when retrieval evidence is insufficient
```

### Why it matters

The agent can help draft reviewer-facing reasoning only when the supporting state is strong enough.

It cannot create decision-support text from weak or incomplete evidence.

---

## 9. Duplicate, retry, and mismatch signals needed safe fallback behavior

### Problem

Some claims should not continue through normal automated routing.

Examples:

```txt
duplicate upload detected
document mismatch signal exists
retry limit exceeded
low-confidence or conflicting state
```

If the agent continued normal processing, it could draft the wrong request or decision note.

### Fix

Guardrails and prompt routing prefer human escalation for risky states.

Examples:

```txt
duplicate signal
→ only clarification, escalation, or no_action allowed

retry count >= 3
→ escalate_to_human, create_review_task, or no_action only

document mismatch + decision draft
→ blocked
```

### Why it matters

Risky workflow states should move toward human review, not deeper automation.

---

## 10. Agent step needed run-status gating

### Problem

The agent should not run while extraction or validation is incomplete.

Unsafe run states include:

```txt
UPLOADED
EXTRACTING
VALIDATING
FAILED
deleted document
```

If the agent runs on unstable state, it may route based on incomplete extraction or missing validation output.

### Fix

Agent-step execution is allowed only after the run has reached a stable validated state:

```txt
COMPLETED
NEEDS_REVIEW
```

### Why it matters

The agent acts only on stable claim state.

Week 4 depends on Week 1 extraction and validation being complete before the agent can route workflow.

---

## 11. RAG wording could be confused with final claim decision

### Problem

Week 3 RAG can retrieve policy clauses and support a coverage assessment.

But a coverage assessment is not the same as claim approval or denial.

Without clear wording, the product could make policy retrieval look like a final claim decision.

### Fix

Separated the concepts:

```txt
coverage assessment
→ advisory policy reasoning based on retrieved evidence

claim approval / rejection
→ final human review decision
```

The Week 4 agent can call retrieval and draft notes, but final decisions remain human-controlled.

### Why it matters

This keeps RAG and agentic workflow inside safe advisory and workflow boundaries.

---

## 12. Prompt-only smoke tests could mutate the database

### Problem

Testing a real tool-calling agent can accidentally create workflow records.

A smoke test that invokes the model and executes tools could create:

```txt
FollowupDraft
ReviewTask
AgentActionLog
ExtractionEvent
```

when the goal was only to check which tool the model would propose.

### Fix

Kept a proposed-tool-call-only smoke path.

```txt
model invoked
→ proposed tool call parsed
→ no tool executed
→ no workflow state mutated
```

### Why it matters

Prompt and tool-selection behavior can be tested without changing database state.

---

## 13. Real runner smoke test needed expected-action validation

### Problem

A real DB-backed runner test can pass superficially even when the selected action is semantically wrong.

For Week 4, this mattered because the runner needed to prove not just that it ran, but that it selected the correct workflow action for the case.

### Fix

Added expected-action validation to the real runner smoke test.

Example:

```bash
EXPECTED_AGENT_ACTION=DRAFT_INFORMATION_REQUEST   bun --env-file ../db/.env scripts/smoke-test-real-run-agent-step.ts <MISSING_POLICY_RUNID>
```

The smoke output checks:

```txt
proposed action
tool name
guardrail decision
executed yes/no
tool output
deterministic post-action output
```

### Why it matters

The test verifies workflow intent, not just script execution.

---

## 14. Tool registry consistency needed documentation

### Problem

The codebase contains both current and legacy/compatibility tools.

This can make documentation misleading if every file in `packages/agent/tools` is described as an active LangChain tool.

Examples:

```txt
ask_clarification
draft_followup_request
mark_needs_more_evidence
```

The Week 4 product flow uses the generalized information request path instead.

### Fix

Documented the active Week 4 tool set separately from legacy or compatibility tools.

Active Week 4 tools:

```txt
retrieve_policy_clauses
create_review_task
draft_information_request
mark_needs_more_info
escalate_to_human
draft_approval_note
draft_denial_reason
no_action
```

Legacy / compatibility notes:

```txt
ask_clarification
draft_followup_request
mark_needs_more_evidence
```

### Why it matters

The docs should reflect the shipped product behavior, not just every file that exists in the folder.

---

## Final failure-case summary

| Failure case | Final design fix |
|---|---|
| Missing `policyNumber` triggered policy retrieval | Deterministic pre-LLM routing |
| Missing fields had no durable loop | Unified Information Request workflow |
| Evidence-only follow-up draft was too narrow | Generalized information request draft |
| Draft created but review not paused | Deterministic `mark_needs_more_info` post-action |
| Agent repeated old requests | Context builder subtracts received information |
| Agent could mutate final reviews | Terminal review guardrails + `no_action` |
| Model could propose unsafe tools | Permission matrix + guardrail rules |
| Decision notes could be drafted too early | Evidence/conflict/exclusion guardrails |
| Duplicate/retry/mismatch cases could continue automation | Safer escalation / blocking rules |
| Agent could run before validation was complete | Agent-step run-status gating |
| RAG output could look like final claim decision | Coverage assessment separated from human decision |
| Prompt smoke tests could mutate DB | Proposed-tool-call-only smoke path |
| Real runner test could pass with wrong action | Expected-action smoke validation |
| Tool docs could overstate active tools | Active tool set documented separately |

---

## What this proves

Week 4’s reliability comes from how failures are handled.

The agent is allowed to help route work, but ClaimFlow decides:

```txt
whether the proposed action is safe
whether the tool can execute
whether workflow state can change
whether final human review is still required
```

That makes the Week 4 agent a guarded workflow subsystem instead of an unrestricted autonomous agent.

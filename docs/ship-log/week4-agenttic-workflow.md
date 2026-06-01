# Week 4 Ship Log — Guarded Agentic Workflow

Week 4 added a guarded agent step to ClaimFlow AI.

The goal was not to make the model approve or reject claims. The goal was to connect the existing ClaimFlow workflow into one clear product loop:

```txt
extraction + validation
→ human review state
→ policy retrieval context
→ agent suggests one safe next action
→ guardrails approve/block
→ workflow tool executes
→ human reviewer makes the final decision
```

This week proves that ClaimFlow AI can use an agent as a workflow router while keeping final claim decisions inside the human review loop.

---

## Public demo

Demo: https://x.com/RitikaxG/status/2061398296137199908?s=20

The demo shows the full Week 4 loop:

```txt
validated claim
→ next recommended action asks to run agent step
→ agent step proposes draft_information_request
→ information request draft is created
→ review moves to NEEDS_MORE_INFO
→ reviewer records requested FIR evidence
→ review reopens
→ human review starts
→ human approves / rejects / edits & approves / requests more info
```

This connects the work from the first four weeks:

```txt
Week 1: extraction + validation
Week 2: human-in-the-loop review
Week 3: policy retrieval / RAG
Week 4: guarded agent workflow routing
```

---

## What shipped

### 1. Single explicit agent step

The agent does not run continuously in the background.

The product exposes one explicit action:

```txt
Run Agent Step
```

This makes the workflow reviewable:

```txt
user clicks Run Agent Step
→ system loads current claim state
→ deterministic routing checks obvious cases
→ LangChain proposes one workflow tool only when needed
→ guardrails evaluate the proposed action
→ the allowed tool executes
→ the latest agent action is shown in the UI
```

The important design decision was to make the agent step visible and interruptible instead of hiding it as automatic backend behavior.

---

### 2. Next recommended action on the run page

After document extraction and validation, the run page can suggest the next action for that document.

For a claim that needs workflow routing, the recommendation asks the reviewer to run the agent step.

This makes the product flow clearer:

```txt
document is uploaded
→ AI extracts structured claim JSON
→ validation detects missing fields / evidence / conflicts
→ run page suggests the next safe action
→ reviewer runs one agent step
```

The recommendation is not the agent itself. It is the UI bridge between deterministic extraction/validation and the new Week 4 agent workflow.

---

### 3. Agent step page

The agent step page gives the reviewer a dedicated place to run the agent.

When the reviewer clicks the action, the backend executes one `runAgentStep`.

The result is shown as the latest agent action.

For the tested theft claim, the latest agent action was:

```txt
DRAFT_INFORMATION_REQUEST
```

This means the agent did not try to approve or reject the claim. It identified that the claim was incomplete and selected a safe workflow tool.

---

### 4. Information request workflow

The agent now treats missing evidence and missing extracted fields as the same product problem:

```txt
the claim cannot continue until more information is received
```

For example, a theft claim missing FIR evidence should not move to final approval.

The agent creates an information request draft that explains what is missing.

The request can include:

```txt
missing evidence
missing field values
or both
```

This replaced the older split mental model where missing evidence and missing fields behaved like separate workflows.

---

### 5. Review pauses at `NEEDS_MORE_INFO`

Creating a draft is not enough by itself.

After the information request draft is created, ClaimFlow also moves the review task into:

```txt
NEEDS_MORE_INFO
```

This makes the workflow durable.

The system is no longer only producing text. It changes the review state to show that the claim is waiting for requested information.

---

### 6. Reviewer records requested information

The reviewer can open the review task and record the requested information.

In the tested flow, the reviewer records that FIR evidence was received.

This creates an auditable event:

```txt
ADDITIONAL_INFORMATION_RECEIVED
```

The original AI extraction remains immutable. Received information is recorded as workflow evidence. If a field value needs to correct the extracted JSON, the human reviewer still owns that correction through the review path.

---

### 7. Review reopens

After requested information is recorded, the review workflow reopens.

The next agent step or human review does not see the same claim state as before.

The agent context builder accounts for received evidence and resolved fields, so the agent should not keep asking for the same FIR or same missing field once it has been recorded.

This is the important loop:

```txt
missing info detected
→ request drafted
→ review waits
→ info received
→ review reopens
→ updated state is used
```

---

### 8. Human review remains final authority

After review reopens, the reviewer can start human review.

The reviewer can then:

```txt
approve
reject
edit and approve
request more information
```

The agent can suggest the next workflow action, but it cannot make the final claim decision.

This preserves the Week 2 human-in-the-loop design while adding Week 4 agent routing.

---

## Where LangChain fits

LangChain is used only for tool selection when the deterministic router does not already know the obvious safe action.

The model receives the current claim state and proposes exactly one tool call.

It does not directly mutate the database.

It does not approve or reject claims.

It does not send emails.

The backend still controls execution:

```txt
LangChain proposes
→ parser normalizes the tool call
→ guardrails evaluate
→ executeAgentTool runs only registered ClaimFlow tools
→ database logs the result
```

The model is a proposer. ClaimFlow remains the workflow authority.

---

## Deterministic routing before the model

Not every case should go to the model.

The backend first checks obvious workflow states:

```txt
final review task
→ no_action

missing fields or missing evidence
→ draft_information_request

otherwise
→ call LangChain agent
```

This prevents the model from making unnecessary or semantically wrong choices for common states.

For example, if `policyNumber` is missing, the system should request missing information before trying policy retrieval.

---

## Active tools

The active registered agent tools are:

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

Legacy tools intentionally excluded from the Week 4 product story:

```txt
ask_clarification
draft_followup_request
```

A compatibility note:

```txt
mark_needs_more_evidence exists in the codebase,
but the preferred Week 4 path is mark_needs_more_info
through the generalized information request workflow.
```

---

## Tool responsibilities

### `draft_information_request`

Creates or reuses a persisted information request draft for missing fields, missing evidence, or both.

This was required because missing fields and missing evidence are both blocking workflow states.

### `mark_needs_more_info`

Moves or creates the review task in `NEEDS_MORE_INFO`.

This was required because a draft alone does not pause the workflow.

### `retrieve_policy_clauses`

Retrieves policy chunks for grounded coverage reasoning.

This connects Week 3 RAG to the Week 4 agent step.

### `escalate_to_human`

Routes ambiguous, risky, conflicting, duplicate, or low-confidence cases to human review.

This is the safe fallback when the agent should not continue.

### `draft_approval_note`

Creates a draft-only approval-style note when evidence and policy support are sufficient.

It does not approve the claim.

### `draft_denial_reason`

Creates a draft-only denial-style rationale when policy evidence supports a likely denial.

It does not reject the claim.

### `create_review_task`

Creates or reuses a review task when human review is needed.

### `no_action`

Returns a safe no-op when the review is already final or no useful mutation is needed.

---

## Guardrails shipped

Guardrails keep the agent inside the ClaimFlow workflow boundary.

They block unsafe actions such as:

```txt
approve_claim
reject_claim
send_email
delete_claim
bypass_review
create_final_decision
create_final_summary
```

They also block unsafe workflow mutations.

For example:

```txt
final review status
→ block follow-ups, escalations, decision drafts, and review mutations
```

Decision-support actions are conditional.

For example:

```txt
draft_approval_note
→ requires policy evidence
→ blocked if missing fields remain
→ blocked if required evidence remains
→ blocked if policy exclusion signal exists
```

This keeps the agent useful without giving it final authority.

---

## What is persisted

The Week 4 workflow persists the agent step in multiple places:

```txt
AgentActionLog
ExtractionEvent timeline
FollowupDraft / information request draft
ReviewTask status
ReviewEvent history
ADDITIONAL_INFORMATION_RECEIVED event
```

The agent action log records proposed, executed, blocked, or failed actions.

The extraction timeline shows when the agent step started, what action was proposed, and whether the tool executed.

The review task records whether the claim is waiting for more information or ready for human review.

---

## What the demo proves

The Week 4 demo proves the full integration loop:

```txt
1. A document is already extracted and validated.
2. The run page suggests running the agent step.
3. The reviewer opens the agent step page.
4. The reviewer runs one agent step.
5. The agent proposes a safe tool.
6. Guardrails allow the tool.
7. The information request draft is created.
8. Review moves to NEEDS_MORE_INFO.
9. Reviewer records requested FIR evidence.
10. Review reopens.
11. Human review starts.
12. Human reviewer approves the claim.
```

The important point is not just that the model selected a tool.

The important point is that the selected tool moved the real product workflow forward without bypassing human review.

---

## What changed from previous weeks

### Week 1

Week 1 proved that documents can be extracted into structured JSON and validated.

### Week 2

Week 2 proved that incomplete or risky outputs can route into human review.

### Week 3

Week 3 proved that policy retrieval can support coverage reasoning with retrieved clauses.

### Week 4

Week 4 connects those pieces with a guarded agent step.

The agent reads the existing claim state and suggests the next safe workflow action.

---

## Known limitations

The Week 4 agent is still intentionally narrow.

Current limitations:

```txt
one agent step at a time
no autonomous multi-step chains
no email sending
no final approval or rejection
no automatic overwrite of extracted JSON
no memory-based reuse of past human corrections yet
```

These are intentional boundaries for safety and explainability.

---

## What moves to Week 5

Week 5 should focus on memory.

The next useful question is:

```txt
Can ClaimFlow reuse past reviewer corrections safely?
```

Possible Week 5 directions:

```txt
remember repeated correction patterns
reuse resolved missing-field mappings
use past human decisions as guidance
avoid overwriting source-of-truth evidence
keep memory behind reviewable guardrails
```

Week 4 created the agent workflow boundary.

Week 5 can add memory inside that boundary.

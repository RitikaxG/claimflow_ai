# Week 4 Ship Log — Guarded Agentic Workflow

Week 4 added a guarded agent step to ClaimFlow AI.

The goal was not to make the model approve, reject, or fully automate claim decisions. The goal was to let the system use the current claim state to suggest and execute the next safe workflow action, while keeping final decisions inside the human review loop.

This week connects the earlier project layers:

```txt
Week 1: extraction + validation
Week 2: human-in-the-loop review
Week 3: policy retrieval / RAG
Week 4: guarded agent workflow routing
```

The agent routes workflow. Guardrails enforce safety. Humans make final decisions.

---

## Public demo

Demo: https://x.com/RitikaxG/status/2061398296137199908?s=20

The demo proves the end-to-end product loop from a validated claim to an agent-suggested information request, review pause, received information, reopened review, and final human decision.

The detailed screen-by-screen workflow lives in:

```txt
docs/week-4/agentic-workflow.md
```

This ship log only records what Week 4 shipped, why it mattered, and what was verified.

---

## What shipped

### 1. Single explicit agent step

Week 4 introduced one explicit action:

```txt
Run Agent Step
```

The agent does not run continuously in the background.

A reviewer intentionally starts the agent step. The backend then loads the current claim state, checks deterministic routing rules, optionally asks LangChain to propose one workflow tool, evaluates the proposal through guardrails, executes the allowed tool, and persists the result.

This makes the agent step explainable and auditable.

---

### 2. Real backend agent runner

The agent runner moved from isolated tool tests to a real database-backed workflow.

The runner now supports:

```txt
AGENT_STEP_STARTED event
claim context loading
deterministic pre-routing
LangChain tool proposal when needed
tool-call parsing
AGENT_ACTION_PROPOSED event
guardrail evaluation
blocked / executed / failed action logging
tool execution through registered ClaimFlow tools
AGENT_TOOL_EXECUTED event
```

This turns the agent from a prompt demo into a workflow subsystem.

---

### 3. Deterministic routing before LangChain

Obvious workflow states are handled before the model is called.

Current deterministic routing:

```txt
final review task
→ no_action

missing fields or required evidence
→ draft_information_request

otherwise
→ call LangChain agent
```

This was an important design decision.

The model should not be used for states the backend can decide safely and deterministically. For example, if a required field or required document is missing, the system should request that information before attempting policy reasoning.

---

### 4. LangChain tool-calling integration

LangChain is used for one narrow responsibility:

```txt
choose the next safe workflow tool when deterministic routing is not enough
```

The model receives the current claim state and must return exactly one tool call.

LangChain does not directly mutate the database. It does not approve or reject claims. It does not send emails.

The backend remains in control:

```txt
LangChain proposes
→ parser normalizes the tool call
→ guardrails evaluate the action
→ executeAgentTool invokes a registered ClaimFlow tool
→ database stores the outcome
```

---

### 5. Information request workflow

Missing evidence and missing extracted fields are now treated as one workflow problem:

```txt
the claim cannot continue until more information is received
```

Week 4 introduced the generalized information request path:

```txt
draft_information_request
→ mark_needs_more_info
→ review waits in NEEDS_MORE_INFO
→ requested information is recorded
→ review reopens
```

This replaced the weaker split between evidence follow-up and field clarification.

The information request draft can represent:

```txt
missing evidence
missing field values
mixed missing information
```

---

### 6. Human-in-the-loop boundary preserved

The agent can suggest the next workflow step, but it cannot make final claim decisions.

Human reviewers still own:

```txt
approve
reject
edit and approve
request more information
```

This keeps Week 4 aligned with the Week 2 review system instead of bypassing it.

---

## Active tools

The active registered tools for the Week 4 agent workflow are:

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

Compatibility note:

```txt
mark_needs_more_evidence exists in the codebase,
but the preferred Week 4 path is mark_needs_more_info
through the generalized information request workflow.
```

---

## Tool responsibilities

| Tool | Responsibility |
|---|---|
| `retrieve_policy_clauses` | Retrieves policy chunks for grounded coverage reasoning. |
| `create_review_task` | Creates or reuses a human review task. |
| `draft_information_request` | Creates or reuses a draft request for missing fields, evidence, or both. |
| `mark_needs_more_info` | Moves or creates the review task in `NEEDS_MORE_INFO`. |
| `escalate_to_human` | Routes ambiguous, risky, duplicate, conflicting, or low-confidence cases to a reviewer. |
| `draft_approval_note` | Produces a draft-only approval-style note when evidence and policy support are sufficient. |
| `draft_denial_reason` | Produces a draft-only denial-style rationale when policy evidence supports likely denial. |
| `no_action` | Safely does nothing when the review is already final or no useful workflow action exists. |

The important rule is that tools execute only after ClaimFlow guardrails allow the proposed action.

---

## Guardrails shipped

Week 4 added deterministic guardrails around proposed agent actions.

Guardrails block unsafe tools and unsafe workflow mutations.

Blocked unsafe actions include:

```txt
approve_claim
reject_claim
send_email
delete_claim
bypass_review
create_final_decision
create_final_summary
```

Guardrails also prevent the agent from mutating review workflow after a final human decision.

Final review statuses are treated as terminal:

```txt
APPROVED
EDITED_AND_APPROVED
REJECTED
```

Decision-drafting actions are conditional. For example, `draft_approval_note` is blocked if required evidence is missing, required fields are missing, policy evidence is missing, validation conflicts exist, or policy evidence indicates an exclusion.

This keeps the model useful as a workflow assistant without making it the decision maker.

---

## Persistence and audit trail

Week 4 stores the agent workflow in durable records instead of only returning text.

Persisted records include:

```txt
AgentActionLog
ExtractionEvent timeline
FollowupDraft / information request draft
ReviewTask status
ReviewEvent history
ADDITIONAL_INFORMATION_RECEIVED event
```

This makes the agent step inspectable after it runs.

The system can answer:

```txt
What action did the agent propose?
Was it allowed or blocked?
Which tool executed?
What did the tool output?
Did review state change?
What information was later received?
```

---

## What the demo proves

The public demo proves that Week 4 is integrated into the existing product workflow.

It shows that ClaimFlow can:

```txt
detect an incomplete claim
suggest running the agent step
draft a missing-information request
pause review in NEEDS_MORE_INFO
record requested information
reopen review
return control to the human reviewer
complete the final decision through HITL review
```

The important proof is not only that LangChain selected a tool.

The important proof is that the selected tool moved a real workflow forward without bypassing review safety.

---

## Evaluation and smoke-test coverage

Week 4 added validation around the agent workflow.

The tested behavior includes:

```txt
agent creates information request
review moves to NEEDS_MORE_INFO
reviewer records evidence / field values
ADDITIONAL_INFORMATION_RECEIVED event is saved
active draft becomes resolved / info received
review reopens to PENDING
reviewer starts review again
human can approve, edit and approve, reject, or request more info
agent does not repeatedly ask for the same received information
```

The final commands for the week were:

```bash
bun run db:migrate
bun run db:generate
bun run check-types
bun run eval:week4:agent
bun run rag:smoke:retrieval-cases
```

The evaluation focus for Week 4 is:

```txt
tool selection correctness
invalid action blocking
unsafe action rate
guardrail behavior
final workflow state correctness
```

---

## Key design decisions

### Agent as proposer, not authority

The model proposes one action. ClaimFlow decides whether that action is allowed.

### Deterministic routing before LLM

Simple workflow states are routed by code before calling the model.

### Drafts instead of sends

The agent can draft information requests and decision notes, but it does not send emails or finalize claims.

### Human review remains the final gate

The final claim decision is still made through the human review workflow.

### Information requests unify missing fields and missing evidence

Missing required documents and missing extracted fields now use one consistent workflow loop.

---

## Known limitations

Week 4 is intentionally narrow.

Current limitations:

```txt
one agent step at a time
no autonomous multi-step chains
no email sending
no final approval or rejection
no automatic overwrite of extracted JSON
no memory-based reuse of past reviewer corrections yet
```

These limits are intentional because the goal was a safe, inspectable workflow agent.

---

## What moves to Week 5

Week 5 should focus on memory.

The next question is:

```txt
Can ClaimFlow reuse past reviewer corrections safely?
```

Possible Week 5 work:

```txt
remember repeated correction patterns
reuse resolved missing-field mappings
learn from prior reviewer decisions
avoid overwriting source-of-truth extraction
keep memory behind reviewable guardrails
```

Week 4 created the guarded agent workflow boundary.

Week 5 can add memory inside that boundary.

# Week 4 — Guarded Agentic Workflow

Demo: https://x.com/RitikaxG/status/2061398296137199908?s=20

Week 4 connects the earlier ClaimFlow AI capabilities into one workflow:

```txt
Week 1: extraction + validation
Week 2: human-in-the-loop review
Week 3: policy RAG / policy retrieval
Week 4: guarded agent step that suggests the next safe workflow action
```

The goal of Week 4 is not to make the model approve or reject claims.

The goal is to add a **single guarded agent step** that can inspect the current claim state, suggest the next workflow action, pass that suggestion through guardrails, execute only a registered backend tool, and then hand the work back to the human review loop.

```txt
AI extracts claim data
→ validation detects missing/risky information
→ run page recommends the next action
→ reviewer runs one agent step
→ agent proposes one safe tool
→ guardrails allow/block
→ backend tool executes
→ review state updates
→ human reviewer continues the final decision
```

![Agentic workflow architecture](./images/agentic-workflow.png)

---

## Product loop proven in Week 4

This is the actual user-facing loop proven by the Week 4 demo.

```txt
Run page
→ Agent step page
→ Latest agent action
→ Information request draft
→ Open review task
→ Record requested information
→ Review reopens
→ Review task shows info received
→ Start human review
→ Human approves / edits & approves / rejects / requests more info
```

The important design point is that the agent step is only one part of the larger claim workflow. It suggests and prepares the next safe action, but the human reviewer still owns the final claim decision.

---

## 1. Run page recommends the next action

After document upload, extraction, and validation, the run page shows the next recommended action for that document.

At this point, Week 1 has already done the extraction and validation work. The app knows whether fields are missing, evidence is missing, conflicts exist, or the claim needs review.

The run page does not ask the model to decide the claim. It simply tells the user that the next useful step is to run the agent.

![Next recommended action](./images/next-recommended-action.png)

In this workflow, the recommendation is:

```txt
Run Agent Step
```

That means:

```txt
The claim has enough state for the agent runner to inspect it and suggest the next safe workflow action.
```

---

## 2. User opens the Agent Step page and runs one agent step

When the user clicks **Run Agent Step**, the app opens the agent step page.

The page asks the user to run a single agent step. This is important because Week 4 is not an autonomous multi-step agent loop. It is a controlled one-step workflow action.

```txt
User clicks Run Agent Step
→ backend loads current claim state
→ deterministic router checks obvious cases
→ LangChain is called only if needed
→ one proposed tool call is produced
→ guardrails evaluate the proposal
→ allowed tool executes
→ latest agent action is shown in the UI
```

![Agent action suggested](./images/agent-action-suggested.png)

The latest agent action panel shows what the agent proposed. For the demo theft claim, the proposed action was:

```txt
draft_information_request
```

That means the agent did not try to approve or reject the claim. It decided that the claim could not safely continue until missing information or evidence was requested.

---

## 3. What happens inside one agent step

The single agent step is the central Week 4 backend workflow.

```txt
runAgentStep(runId)
→ create AGENT_STEP_STARTED timeline event
→ build current claim context from DB
→ run deterministic routing first
→ if no deterministic action exists, call LangChain
→ parse exactly one proposed tool call
→ write AgentActionLog: PROPOSED
→ write AGENT_ACTION_PROPOSED timeline event
→ evaluate guardrails
→ if blocked, write BLOCKED log/event and stop
→ if allowed, execute the registered tool
→ if needed, run deterministic post-action
→ write AgentActionLog: EXECUTED / FAILED
→ write AGENT_TOOL_EXECUTED timeline event
```

The backend remains the authority. The model only proposes the next tool call.

---

## 4. Claim state loaded by the agent

The agent does not work from hidden memory. It works from the current database state.

![Week 4 DB design](./images/db-design.png)

The context includes:

| State | Why it matters |
|---|---|
| `ExtractionRun` | The latest extraction attempt for the document |
| `validationJson` | Missing fields, missing evidence, conflicts, warnings |
| `ReviewTask` | Current human review state |
| latest `CoverageQuestion` | Whether policy retrieval already happened and what the retrieval status is |
| `ExtractionEvent` timeline | Prior workflow events, retries, duplicates, received information |
| recent `AgentActionLog` records | Previous agent actions for this run |

The agent context builder also reads timeline events for received information. If FIR evidence or a missing field value was already recorded, the next agent step should not ask for it again.

---

## 5. Deterministic router runs before LangChain

Not every workflow decision should be delegated to the model.

The runner first handles obvious states with deterministic rules:

| Current state | Action |
|---|---|
| Review is already `APPROVED`, `EDITED_AND_APPROVED`, or `REJECTED` | `no_action` |
| Required evidence is missing | `draft_information_request` |
| Required extracted fields are missing | `draft_information_request` |
| None of the above is obvious | Call LangChain to propose one tool |

This is why missing `policyNumber` does not jump directly to policy retrieval. The workflow first needs the missing policy number or supporting document.

This is also why finalized reviews are protected. Old missing-field or evidence history may still exist for audit reasons, but the agent should not reopen a final review.

---

## 6. Where LangChain plays a part

LangChain is used only when the deterministic router does not already know the next safe action.

The model receives:

```txt
claim state
+ tool descriptions
+ system prompt rules
```

It must return exactly one tool call.

The model can propose tools such as:

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

LangChain does not execute the tool directly. ClaimFlow parses the proposed tool call into an internal action, evaluates guardrails, and only then executes the registered backend tool.

This is the Week 4 agent contract:

```txt
Model proposes.
Guardrails decide.
Backend executes.
Human reviewer decides the claim.
```

---

## 7. This is not an autonomous ReAct loop

Week 4 should not be described as an open-ended autonomous ReAct agent.

It is closer to a **single-step tool-calling workflow**:

```txt
observe current claim state
→ propose one next tool
→ guardrail check
→ execute allowed tool
→ persist result
→ return control to the product UI / human reviewer
```

The loop in Week 4 is a product workflow loop, not an unlimited model loop.

```txt
Run page
→ agent step
→ review task
→ received information
→ reopened review
→ human decision
→ later agent step can re-evaluate updated state
```

That design is safer for claims processing because every step is visible, logged, and interruptible by a human.

---

## 8. Registered tools

![Agent tools](./images/agent_tools.png)

The active Week 4 tool set is:

| Tool | What it does | Why it exists |
|---|---|---|
| `create_review_task` | Creates or reuses a human review task | Makes review a durable workflow artifact |
| `draft_information_request` | Creates or reuses a draft request for missing fields, missing evidence, or both | Unifies missing documents and missing field handling |
| `mark_needs_more_info` | Moves or creates the review task in `NEEDS_MORE_INFO` | Gives the request a durable waiting state |
| `retrieve_policy_clauses` | Retrieves policy chunks for coverage reasoning | Integrates Week 3 RAG into the agent step |
| `escalate_to_human` | Routes ambiguous, conflicting, duplicate, or low-confidence cases to review | Safer than guessing |
| `draft_approval_note` | Produces a non-final approval-style reviewer note | Helps decision support without approving |
| `draft_denial_reason` | Produces a non-final denial-style rationale | Helps decision support without rejecting |
| `no_action` | Returns a safe no-op | Protects finalized reviews from mutation |

Legacy / compatibility note:

```txt
ask_clarification and draft_followup_request are legacy paths.
mark_needs_more_evidence exists in the codebase as a narrower evidence-specific path,
but the generalized Week 4 loop uses draft_information_request + mark_needs_more_info.
```

---

## 9. Guardrails

Guardrails are what make the agent workflow safe.

The model may propose an action, but it cannot force the backend to execute it.

Guardrails allow safe workflow actions:

```txt
policy retrieval
review task creation
information request drafting
needs-more-info state transition
human escalation
non-final approval / denial notes
no action for final review
```

Guardrails block unsafe or incorrect actions:

```txt
approve claim
reject claim
send email
delete claim
bypass review
create final decision
create final summary
mutate review after final human decision
draft approval while evidence or fields are missing
draft decision notes when policy evidence is insufficient
```

This keeps the model inside the workflow boundary.

The agent can help prepare the next step, but it cannot become the claims approver.

---

## 10. Information request is drafted

For the example theft claim, the agent selected:

```txt
draft_information_request
```

The information request draft tells the reviewer what evidence or field value is missing.

![Information request drafted](./images/information-request-drafted.png)

This request can be:

| Request type | Example |
|---|---|
| Evidence-only | Police report is missing |
| Field-only | Policy number is missing |
| Mixed | FIR number and FIR document are missing |

The important Week 4 design update is that missing fields and missing evidence are now part of the same product flow.

Before:

```txt
missing evidence → follow-up request
missing field → vague clarification
```

Now:

```txt
missing evidence or missing field
→ information request draft
→ review NEEDS_MORE_INFO
→ received info recorded
→ review reopens
```

The draft is not sent as an email. It is a persisted workflow artifact that a reviewer can inspect.

---

## 11. Deterministic post-action pauses the review

Creating a draft is not enough.

After the information request draft is created, the runner performs a deterministic post-action:

```txt
draft_information_request succeeds
→ mark_needs_more_info runs
→ ReviewTask becomes NEEDS_MORE_INFO
```

This is what makes the workflow durable.

The review is no longer just showing a draft message. It is actually paused until the requested information arrives.

---

## 12. Reviewer opens the review task and records requested information

After the user knows what information is missing, they can open the review task.

The review task page asks the reviewer to provide the requested evidence or field value.

![Requested information received](./images/requested-info-received.png)

For the theft claim example, the reviewer records the FIR / police report information.

This creates an additional-information event in the workflow timeline.

The original AI extraction is not silently overwritten. If a missing field must become part of the final corrected claim data, the reviewer updates it through the human review correction flow.

---

## 13. Review reopens after information is received

Once the missing information is recorded, the review workflow reopens.

![Review reopened](./images/review-reopened.png)

This reopen step belongs to the review/product workflow, not to the model.

The key result is that the next agent step sees a different claim state:

```txt
Previously missing FIR
→ FIR recorded in timeline
→ agent context removes FIR from missing evidence
→ agent does not ask for FIR again
```

---

## 14. Review task shows that information was received

The review task now shows the old request as resolved audit history.

![Review task shows info received](./images/review-task-shows-info-received.png)

This matters because the workflow is explainable:

```txt
Agent requested information
→ reviewer provided information
→ system recorded it
→ review reopened
→ reviewer can continue
```

The agent is not acting invisibly. Every state transition has a visible UI state and an audit trail.

---

## 15. Human reviewer starts review

After the review is reopened, the reviewer can start the normal human review step.

![Starts human review](./images/starts-human-review.png)

At this point, Week 2 human-in-the-loop behavior takes over.

The human reviewer can:

```txt
approve
edit and approve
reject
request more information again
```

If the reviewer needs to update the corrected claim JSON, that happens through the human edit-and-approve path.

This is the authority boundary:

```txt
Agent step: suggests next action and prepares workflow artifacts.
Human review: makes the final claim decision.
```

---

## 16. Human reviewer approves the claim

After the reviewer checks the provided information and decides the claim can be approved, the claim status updates through the human review workflow.

![Human review approved](./images/human-review-approved.png)

The final approval is not an agent action.

It is a human-in-the-loop decision.

This is the core safety claim of Week 4:

```txt
The agent can route the work.
The agent can retrieve policy evidence.
The agent can draft support notes.
The agent can request missing information.
But the agent cannot approve or reject the claim.
```

---

## 17. Where Week 3 RAG fits into Week 4

Policy retrieval is now integrated into the agent step.

If the claim has no missing fields/evidence and the latest retrieval status is empty, the agent can propose:

```txt
retrieve_policy_clauses
```

That tool calls the Week 3 retrieval layer and returns policy chunks for coverage reasoning.

The important design is that RAG is not a separate disconnected demo anymore.

```txt
Week 3 RAG
→ becomes a tool available to the Week 4 agent
→ agent can retrieve policy clauses when claim state is ready
→ later decision-support notes must be grounded in policy evidence
```

If policy evidence is insufficient, the safe next step is escalation or information request, not approval.

---

## 18. Full end-to-end workflow

The complete demo flow is:

```txt
1. Claim document is uploaded.
2. AI extracts structured claim JSON.
3. Validation detects missing fields, missing evidence, conflicts, or warnings.
4. Run page recommends the next action.
5. User opens the Agent Step page.
6. User runs one agent step.
7. Deterministic router checks final/missing-info states first.
8. LangChain proposes exactly one tool call only if needed.
9. Guardrails allow or block the proposed action.
10. Backend executes only the registered allowed tool.
11. For missing information, information request draft is created.
12. Review task moves to NEEDS_MORE_INFO.
13. Reviewer records requested information.
14. Review reopens.
15. Review task shows received information.
16. Human reviewer starts review.
17. Human reviewer approves, edits and approves, rejects, or requests more info.
```

This is how the weeks connect:

| Week | Capability | Role in final loop |
|---|---|---|
| Week 1 | Extraction + validation | Finds structured claim data and missing/risky items |
| Week 2 | Human-in-the-loop review | Gives humans authority over approve/reject/edit/request-more-info |
| Week 3 | Policy RAG | Retrieves policy clauses for grounded coverage reasoning |
| Week 4 | Guarded agent step | Suggests the next safe workflow action and executes allowed tools |

---

## 19. Smoke tests and eval proof

The smoke tests prove the backend agent runner works beyond the UI demo.

### Proposed tool-call smoke test

This checks that the model can propose a valid tool call and that ClaimFlow can parse it.

It does not execute the tool.

![Smoke test agent step](./images/smoke-test-agent-step.png)

### Real agent runner smoke test — missing information

This checks the full backend runner path:

```txt
load DB state
→ choose safe action
→ evaluate guardrails
→ execute tool
→ run deterministic post-action
→ persist logs and events
```

![Real agent runner smoke test 1](./images/smoke-test-real-agent-runner-1.png)

### Real agent runner smoke test — tool output and post-action

This proves the tool output is safe and that the deterministic post-action can pause the review workflow.

![Real agent runner smoke test 2](./images/smoke-test-real-agent-runner-2.png)

### Real agent runner smoke test — final review no-op

This proves finalized reviews are protected.

![Real agent runner smoke test 3](./images/smoke-test-real-agent-runner-3.png)

A final review should produce:

```txt
NO_ACTION
```

not a new information request, not escalation, and not another review mutation.

---

## 20. Evaluation result

The Week 4 eval focuses on safety and workflow correctness.

![Week 4 eval result](./images/eval-result.png)

The eval should answer:

| Metric | Question |
|---|---|
| Tool selection accuracy | Did the agent choose the expected safe tool? |
| Invalid-action blocking | Were unsafe tool calls blocked? |
| Unsafe approval rate | Did the system avoid approval without evidence? |
| Final-state correctness | Did the workflow land in the expected product state? |
| Human-review preservation | Did final decisions remain human-owned? |

The most important metric is:

```txt
unsafe_final_action_rate = 0
```

---

## What Week 4 proves

Week 4 proves that ClaimFlow AI can run a guarded agent workflow on real product state.

It proves:

1. The run page can recommend running the agent after extraction and validation.
2. The agent step page can run one controlled agent step.
3. LangChain can propose the next workflow tool from claim state.
4. Deterministic routing handles obvious states before the model.
5. Guardrails block unsafe or final-decision behavior.
6. Tools create real workflow artifacts such as information request drafts and review state transitions.
7. Missing evidence and missing fields now follow one information-request loop.
8. Received information changes future agent context so the agent does not ask for the same item again.
9. Policy retrieval from Week 3 is available as an agent tool.
10. The human reviewer remains the final approval/rejection authority.

---

## Known limitations

Week 4 intentionally keeps the agent conservative.

Current limitations:

- The agent does not send emails.
- The agent does not approve claims.
- The agent does not reject claims.
- The agent does not run an unbounded autonomous ReAct loop.
- Approval and denial notes are decision-support outputs, not final decisions.
- The review reopen step belongs to the review/product workflow, not inside `runAgentStep` itself.
- The agent uses current DB state and timeline events; long-term correction memory is left for Week 5.

---

## Final summary

Week 4 adds a guarded LangChain tool-calling step to ClaimFlow AI.

The agent receives the current claim state, proposes exactly one next workflow tool, passes through deterministic guardrails, executes only registered backend tools, and persists the result as audit history.

The user-facing loop is:

```txt
next recommended action
→ run agent step
→ agent suggests safe tool
→ information request draft appears
→ reviewer records requested info
→ review reopens
→ human review starts
→ human approves / edits / rejects / requests more info
```

That is the Week 4 proof-of-work: ClaimFlow AI now has an agentic workflow layer, but the system remains safe because the model only assists the process. The human reviewer decides the claim.

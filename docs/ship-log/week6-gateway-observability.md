# Week 06 Ship Log — AI Gateway, Observability, and Governance

## Scope

Week 06 shipped the production-control and observability layer for ClaimFlow AI.

Weeks 1–5 proved that the product could extract claims, route human review, answer policy questions with RAG, run guarded agent actions, and use workflow memory. However, the real model calls behind those workflows were still difficult to operate as one governed system.

Week 06 made model behavior traceable, measurable, and auditable at two levels:

```text
system-level eval evidence
→ Is ClaimFlow reliable across known AI failure modes?

single-run trace evidence
→ What exactly happened in this claim run?
```

This step was required because a production AI workflow must explain more than its final answer. It must preserve which model and prompt ran, what the call cost, how long it took, how it failed, whether it was retryable, what the agent did next, and where human review remained in control.

---

## Shipped

### 1. Durable AI-call audit trail

Shipped a durable audit record for every governed model call.

For each call, ClaimFlow can now answer:

```text
Which claim run did it belong to?
Which AI capability made the call?
Which provider, model, prompt, and output schema were used?
Did it start, succeed, fail, become retryable, or get blocked?
How long did it take?
How many tokens did it use and what was the estimated cost?
Why did it fail, and is retrying safe?
```

The log lifecycle is:

```text
STARTED → SUCCEEDED
STARTED → FAILED
STARTED → RETRYABLE
STARTED → BLOCKED
```

![Week 06 database design](../week-06/images/db-design.png)

---

### 2. Governed model-call control layer

Shipped one shared control layer around ClaimFlow's important AI-provider calls.

The gateway records an attempt before calling the provider and then completes the same record with the final outcome. This means even a timeout or provider outage leaves behind evidence that the call was attempted.

Failure classification shipped:

```text
invalid JSON          → FAILED / INVALID_JSON_RESPONSE
missing model version → BLOCKED / MISSING_MODEL_VERSION
timeout               → RETRYABLE / MODEL_TIMEOUT
provider 500          → RETRYABLE / PROVIDER_ERROR
cost limit exceeded   → BLOCKED / COST_LIMIT_EXCEEDED
latency spike         → SUCCEEDED with LATENCY_SPIKE warning metadata
```

A missing trace ID is generated at the gateway boundary so a governed call does not become untraceable.

---

### 3. Centralized prompt and schema versioning

Shipped one governed source for the prompt and output-schema versions used by each AI capability.

The governed capabilities include:

```text
claim extraction
policy coverage answering
model-backed agent planning
synthetic gateway evaluation
```

This prevents prompt and schema versions from being scattered across call sites and makes regression evidence comparable.

---

### 4. Traceable PDF and email extraction

Shipped gateway control for both PDF and email claim extraction.

Every extraction call is linked to the claim run and its shared trace, allowing the model call to be followed into validation, review, agent, and memory events.

Sensitive source content is not duplicated into the AI-call audit log. PDF logs retain source metadata rather than bytes, and email logs retain content length rather than the full email body.

---

### 5. Traceable policy coverage answers

Shipped gateway control for the model-backed part of policy RAG answer generation.

The audit record stores compact retrieval context:

```text
the coverage question
whether retrieval found sufficient evidence
why retrieval succeeded or refused
which policy chunks and clauses supported the call
how many evidence chunks were used
```

When retrieval returns `INSUFFICIENT_EVIDENCE`, generation is skipped and no gateway call is fabricated. Gateway logs represent real provider calls only.

---

### 6. Traceable model-backed agent planning

Shipped gateway control for the model-backed agent planner.

Only the model-backed planner path creates an AI gateway log. Deterministic routing remains visible in agent/workflow records but is not mislabeled as a provider call.

The planner log stores a compact context summary rather than duplicating the complete claim state.

---

### 7. Repeatable gateway smoke proof

Shipped a repeatable smoke test covering success, invalid JSON, missing model version, timeout, provider error, and cost blocking.

The test compares the returned gateway result with the persisted AI-call record. This proves the feature produces durable operational evidence instead of only returning the correct status in memory.

![Gateway wrapper smoke-test result](../week-06/images/gateway-smoke-warpper-result.png)

---

### 8. Repeatable observability failure dataset

Shipped nine deterministic synthetic gateway cases that reproduce important production failure modes.

Cases cover:

```text
model timeout
invalid JSON
provider error
cost limit exceeded
latency spike
prompt regression
eval-score regression
missing trace ID
missing model version
```

Synthetic cases are necessary because real provider failures cannot be scheduled reliably for local development, CI, or demos.

---

### 9. Executable gateway observability evaluation

Shipped an eval that executes every synthetic case through the real gateway, reads the persisted call record, compares actual behavior with the expected result, calculates operational metrics, and produces human-readable and machine-readable reports.

Latest committed result:

```text
cases: 9
passed: 9
failed: 0
eval pass rate: 100%
```

---

### 10. Eval dashboard

Shipped persisted eval-run visibility for controlled Week 1–6 evaluation evidence.

The dashboard separates assertion health from intentionally generated failure signals. A healthy observability eval can have a 100% pass rate while also showing timeout, invalid JSON, retryable failure, and blocked-cost rates above zero.

![Week 06 eval dashboard](../week-06/images/eval-dashboard.png)

---

### 11. One-run trace dashboard

Shipped a dedicated trace route:

```text
/runs/[runId]/trace
```

The trace joins the operational story for one claim:

```text
upload
→ extraction
→ gateway call
→ validation
→ RAG
→ memory retrieval
→ agent proposal
→ guardrail decision
→ information request
→ review event
→ human decision
→ memory update
```

The trace is linked from the run experience rather than embedded as another extraction panel. This keeps claim work and observability evidence related but conceptually separate.

![Week 06 run observability](../week-06/images/week6-observability-1.png)

![Week 06 trace dashboard](../week-06/images/week6-observability-2.png)

---

### 12. Trace-workflow hardening

End-to-end trace testing exposed workflow bugs outside the gateway itself. Week 06 hardening covered:

```text
do not move review to pending when required information is still absent
validate the specific outstanding requirements, not unrelated fields
create recurring-field memory from trusted edit-and-approve corrections
retrieve recurring missing-field memory for future claims
preserve memory as guidance rather than auto-filled evidence
```

These fixes matter to observability because a trace is only useful when it reports a valid workflow. Better logging cannot compensate for an invalid state transition or a missing learning event.

---

## Eval metrics shipped

```text
eval_pass_rate
cost_per_run
latency_p95
model_error_rate
invalid_json_rate
prompt_version_regression_rate
missing_trace_rate
missing_model_version_rate
retryable_failure_rate
blocked_by_cost_policy_rate
```

The central distinction is:

```text
eval_pass_rate
= did the system detect and classify the case as expected?

failure rates
= which controlled production risks were observed?
```

---

## Final status

Week 06 observability and governance is shipped.

Completed layers:

```text
AI-call persistence
gateway lifecycle wrapper
failure classification
cost and latency recording
prompt/model/schema versioning
extraction gateway integration
coverage-answer gateway integration
agent-planner gateway integration
synthetic observability dataset
repeatable gateway eval runner
persisted eval evidence
system-level eval dashboard
single-run trace dashboard
trace-workflow safety hardening
```

The production meaning of Week 06 is:

```text
ClaimFlow AI can show what the AI called,
why it was allowed or blocked,
how it performed,
what happened next,
and whether the complete workflow remained safe.
```

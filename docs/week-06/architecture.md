# Week 06 Architecture — AI Gateway, Eval Observability, and Run Tracing

## 1. Why Week 06 introduced a new subsystem

Before Week 06, ClaimFlow AI already had feature-level records for extraction, validation, RAG, review, agent actions, and memory. What it lacked was a shared control plane for model calls and a unified way to inspect their operational behavior.

The new subsystem was required to answer production questions:

```text
Which model and prompt produced this output?
Was the call successful, retryable, failed, or intentionally blocked?
How long did it take and what did it cost?
Can a failure be reproduced through an eval?
Can one claim be explained end to end?
Did memory, guardrails, and human review influence the outcome safely?
```

Week 06 adds three connected but distinct layers:

```text
AI gateway
→ controls and records real provider calls

eval observability
→ proves behavior across controlled failure scenarios

run tracing
→ explains one actual claim workflow
```

---

## 2. System boundary

```text
Extraction service ───────┐
Coverage-answer service ──┼─→ callModelThroughGateway()
Agent model planner ──────┘              │
                                         ├─→ AiCallLog
                                         ├─→ cost/latency policy
                                         ├─→ failure classification
                                         └─→ structured result

Synthetic gateway cases
→ Week 06 eval runner
→ persisted eval run/results
→ eval dashboard

One real claim run
→ trace aggregator
→ ordered workflow events
→ /runs/[runId]/trace
```

The gateway does not replace feature records. It adds operational evidence around provider execution.

---

## 3. AI gateway responsibilities

The gateway owns:

```text
call lifecycle logging
trace correlation
model/prompt/schema version enforcement
timeout handling
response parsing boundary
failure classification
retryability classification
token accounting
estimated cost
cost-policy blocking
latency warnings
compact observability metadata
```

The gateway does not own:

```text
claim validation rules
coverage decisions
agent guardrails
human review decisions
memory truth
provider-specific business prompts
```

This boundary keeps operational governance centralized while domain responsibility stays in the feature packages.

---

## 4. Gateway call lifecycle

```text
1. Receive call configuration and run context
2. Resolve or generate traceId
3. Create AiCallLog(status = STARTED)
4. Enforce required governance metadata
5. Execute provider call with timeout
6. Parse/validate expected JSON when required
7. Calculate tokens, cost, and latency
8. Enforce cost policy
9. Detect latency warning
10. Update the same AiCallLog with final state
11. Return a structured GatewayCallResult
```

State transitions:

| Final state | Meaning | Example |
|---|---|---|
| `SUCCEEDED` | A valid response was returned | Normal call or valid slow call |
| `FAILED` | The provider returned an unusable result | Invalid JSON |
| `RETRYABLE` | A transient provider/runtime failure occurred | Timeout or provider 500 |
| `BLOCKED` | Governance intentionally prevented completion | Missing model version or cost limit |

`LATENCY_SPIKE` is warning metadata on a successful valid call, not a separate failed state.

---

## 5. Correlation model

The main correlation keys are:

```text
runId
→ business workflow identity

traceId
→ operational execution identity

aiCallLogId
→ one governed provider call
```

Run routes pass:

```text
traceId = run_<runId>
runId = <runId>
```

If a trace ID is absent, the gateway generates one. This protects the observability invariant:

```text
every persisted governed call must be traceable
```

---

## 6. Version governance

Reproducibility requires more than a model name.

Each call records:

```text
provider
model
modelVersion
promptVersion
schemaVersion
```

The prompt registry centralizes known prompt/schema versions for extraction, RAG answers, agent planning, and synthetic gateway tests.

Missing `modelVersion` is treated as a governance violation and is blocked before provider execution.

---

## 7. Failure classification architecture

```text
provider/model execution
        │
        ├─ malformed expected JSON
        │    → FAILED / INVALID_JSON_RESPONSE
        │
        ├─ timeout
        │    → RETRYABLE / MODEL_TIMEOUT
        │
        ├─ provider error
        │    → RETRYABLE / PROVIDER_ERROR
        │
        ├─ missing model version
        │    → BLOCKED / MISSING_MODEL_VERSION
        │
        ├─ cost exceeds configured limit
        │    → BLOCKED / COST_LIMIT_EXCEEDED
        │
        └─ valid but slow response
             → SUCCEEDED / LATENCY_SPIKE warning
```

This design lets downstream systems decide whether to retry, alert, stop, or continue without parsing arbitrary error strings.

---

## 8. Cost and latency policy

Estimated cost is calculated from token counts and configured input/output rates.

```text
input token cost
+ output token cost
= estimatedCostUsd
```

If the configured per-call limit is exceeded, the gateway records the calculated cost and blocks the result.

Latency is measured at the wrapper boundary. `latency_p95` is calculated across eval cases to expose slow-tail behavior that an average can hide.

---

## 9. Privacy-aware logging

The architecture follows a compact-metadata rule:

```text
log enough to explain the call
do not duplicate the complete sensitive source
```

Examples:

| Call kind | Stored in gateway input | Kept in feature records |
|---|---|---|
| PDF extraction | source type, MIME type, file path metadata | PDF bytes/document |
| Email extraction | content length and source metadata | Full submitted email |
| RAG answer | question, retrieval state, chunk/clause IDs and counts | Retrieved clause text and citations |
| Agent planner | counts and compact run/review/memory state | Full claim and agent context |

This reduces leakage, storage duplication, and log-retention complexity.

---

## 10. Why deterministic actions bypass the AI gateway

The agent workflow includes deterministic routing and a model-backed planner.

Only the planner is a provider call:

```text
deterministic rule/action
→ agent/workflow audit only

model-backed plan
→ agent/workflow audit + AiCallLog
```

This preserves accurate call counts and prevents zero-cost business logic from appearing as model usage.

---

## 11. Synthetic observability eval architecture

Each case contains:

```text
manifest.json
input.json
expected.json
```

The loader verifies that `caseId` matches across all files and sorts cases deterministically.

Runner flow:

```text
load case
→ create deterministic provider behavior
→ call real gateway wrapper
→ read persisted AiCallLog
→ compare result and database record with expected.json
→ calculate case checks and suite metrics
→ write JSON and Markdown reports
```

The provider simulation makes failure testing repeatable without relying on a real outage or malformed live model response.

---

## 12. Eval metrics and their meaning

| Metric | Meaning |
|---|---|
| `eval_pass_rate` | Percentage of cases whose expected assertions passed |
| `cost_per_run` | Total estimated model cost represented by the eval run |
| `latency_p95` | Slow-tail gateway latency |
| `model_error_rate` | Timeout and provider-error frequency |
| `invalid_json_rate` | Malformed output frequency |
| `prompt_version_regression_rate` | Prompt-governance regression frequency |
| `missing_trace_rate` | Persisted calls without a trace ID; target is zero |
| `missing_model_version_rate` | Calls correctly blocked for absent model metadata |
| `retryable_failure_rate` | Failures safe to retry |
| `blocked_by_cost_policy_rate` | Calls blocked by spend governance |

Synthetic failure rates are observability signals. They do not lower `eval_pass_rate` when the gateway classified them correctly.

---

## 13. Eval dashboard boundary

The eval dashboard answers:

```text
Is the system reliable across known test scenarios?
```

It operates on suites and packets, not one customer claim.

Its users need:

```text
suite result
pass/fail/warning counts
metric trends
case matrix
regression evidence
dashboard-ready persisted output
```

![Eval dashboard](images/eval-dashboard.png)

---

## 14. Run trace boundary

The run trace answers:

```text
What happened in this one claim run, and why?
```

It joins references from existing subsystem records rather than replacing them:

```text
Document
ExtractionRun / ExtractionEvent
AiCallLog
validation output
CoverageQuestion / retrieval evidence
MemoryHit
AgentActionLog
guardrail result
InformationRequest / draft
ReviewTask / review events
human decision
MemoryUpdate
```

The trace must preserve chronology, source subsystem, status, and drill-down metadata.

![Single-run trace](images/trace-workflow-1.png)

---

## 15. Why eval and trace are separate dashboards

| Concern | Eval dashboard | Run trace dashboard |
|---|---|---|
| Unit of analysis | Eval suite and synthetic case | One real claim run |
| Main question | Does the system handle known failures correctly? | What happened in this workflow? |
| Primary evidence | Expected vs actual assertions and metrics | Ordered cross-subsystem events |
| Typical user | Engineer/interviewer evaluating reliability | Engineer/reviewer investigating one run |
| Time perspective | Regression across repeatable runs | Chronology within one run |

Combining them would make both harder to understand. The run page therefore links to a dedicated trace view, while eval results remain in the eval dashboard.

---

## 16. Workflow correctness as an observability dependency

Trace testing exposed that operational evidence is trustworthy only when state transitions are trustworthy.

Example:

```text
information request drafted
→ reviewer attempts move to pending
→ system must verify requested field/evidence is now present
→ only then record the transition
```

The check must use the active request’s required items. It must not pass merely because a draft exists, and it must not fail because of unrelated validation items.

This preserves the invariant:

```text
trace status describes reality, not button clicks
```

---

## 17. Memory in the trace

Memory has three distinct trace events:

```text
retrieved
→ MemoryHit exists

used by agent
→ usedByAgent = true and action link exists

confirmed or contradicted by reviewer
→ MemoryUpdate records trusted feedback
```

For recurring missing fields, episodic correction memory remains entity-safe, while generalized field-pattern memory can warn future claims with the same `fieldPath`.

The trace must never imply that the historical value became current evidence.

---

## 18. Architecture tradeoffs

### Tradeoff 1 — One gateway, feature-owned prompts

Centralized operations make calls comparable, while feature packages retain domain logic.

### Tradeoff 2 — Structured failures over thrown strings

More mapping code is required, but retry and governance behavior becomes deterministic.

### Tradeoff 3 — Compact metadata over complete payload capture

Some forensic detail stays in feature tables, but privacy and duplication risk are lower.

### Tradeoff 4 — Synthetic provider behavior over live failure dependence

Synthetic cases do not measure provider quality, but they prove ClaimFlow’s failure-handling contract repeatably.

### Tradeoff 5 — Separate eval and trace views

The UI has two observability surfaces, but each answers one clear operational question.

### Tradeoff 6 — Generate missing trace ID, block missing model version

Trace identity can be safely repaired at the boundary. Model-version absence cannot be repaired without inventing governance metadata, so the call is blocked.

### Tradeoff 7 — Successful latency warning

A slow valid response remains usable, while warning metadata still supports performance alerts.

---

## 19. Production invariants

```text
Every governed provider attempt creates a durable log.
Every persisted governed call has a trace ID.
Every governed call identifies model, prompt, and schema versions.
Retryable and blocked failures are distinguishable.
Valid slow calls remain successful but visible.
Sensitive source content is not needlessly duplicated.
Synthetic evals assert both returned and persisted behavior.
One-run traces preserve subsystem boundaries and chronology.
Review status cannot advance without the information it claims to have received.
Memory may explain routing but cannot become current claim evidence.
```

---

## 20. Final architecture summary

Week 06 changes ClaimFlow AI from a set of model-backed features into an operable AI workflow.

```text
real provider calls
→ governed gateway
→ durable AiCallLog
→ cost, latency, version, and failure evidence

controlled failure packets
→ repeatable eval runner
→ persisted reports
→ system-level eval dashboard

real claim records
→ cross-subsystem trace
→ one-run explanation
→ workflow and memory audit
```

The core design principle is:

```text
An AI workflow is not production-ready merely because it returns an answer.
It must be observable when it succeeds, diagnosable when it fails,
governed when it should not run, and explainable through the full workflow.
```

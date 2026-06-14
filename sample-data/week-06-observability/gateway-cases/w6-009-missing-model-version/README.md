# Week 06 - Gateway Observability Dataset

This folder contains the Week 6 dataset for ClaimFlow AI's **AI gateway and observability** layer.

The dataset does not add new claim adjudication logic. It proves that every AI call in the agent workflow can be traced, measured, governed, evaluated, and explained when something fails.

```txt
model call
-> gateway boundary
-> structured AI call log
-> deterministic eval evidence
-> dashboard-ready observability signal
```

---

## Core rule

The gateway is the audit boundary for AI behavior.

It must record:

```txt
traceId
runId
call kind
provider
model
modelVersion
promptVersion
schemaVersion
inputJson
outputJson
parsedOutputJson
status
failure type
retryability
latency
tokens
estimated cost
metadata
```

It must never:

- silently drop model failures
- hide invalid JSON failures
- treat retryable and non-retryable failures the same
- allow governed calls without model version metadata
- ignore configured cost limits
- lose traceability when the caller omits a trace ID
- depend on real provider outages for eval coverage

---

## Folder structure

```txt
sample-data/week-06-observability/
  README.md

  gateway-cases/
    w6-001-model-timeout/
      manifest.json
      input.json
      expected.json

    w6-002-invalid-json-response/
      manifest.json
      input.json
      expected.json

    w6-003-cost-limit-exceeded/
      manifest.json
      input.json
      expected.json

    w6-004-provider-error/
      manifest.json
      input.json
      expected.json

    w6-005-latency-spike/
      manifest.json
      input.json
      expected.json

    w6-006-prompt-version-regression/
      manifest.json
      input.json
      expected.json

    w6-007-eval-score-dropped/
      manifest.json
      input.json
      expected.json

    w6-008-missing-trace-id/
      manifest.json
      input.json
      expected.json

    w6-009-missing-model-version/
      manifest.json
      input.json
      expected.json

  eval-runs/
    synthetic-run-success.json
    synthetic-run-failure.json
    synthetic-run-cost-spike.json
    synthetic-run-latency-spike.json

  eval-results/
    .gitkeep
```

---

## Why this dataset exists

ClaimFlow AI already has extraction, human review, policy-grounded RAG, safe agent actions, and workflow memory.

Week 6 adds the production proof around those AI behaviors:

```txt
Can every model call be audited?
Can gateway failures be classified?
Can cost and latency be measured?
Can governance rules block unsafe calls?
Can eval and dashboard layers read the same structured evidence?
```

The dataset is intentionally synthetic. Timeout, provider error, invalid JSON, cost spike, and latency spike cases should be deterministic instead of depending on real provider failures.

---

## Data model idea

Each gateway packet represents one controlled AI-call scenario:

```txt
gateway input
-> synthetic provider behavior
-> expected gateway result
-> expected AiCallLog fields
-> expected dashboard/eval signal
```

The packet should be small enough for evals to run repeatedly, but complete enough to prove the gateway stores the evidence needed for debugging and governance.

---

## `gateway-cases/`

Each folder under `gateway-cases/` is one observability packet.

Every packet has:

```txt
manifest.json
input.json
expected.json
```

### `manifest.json`

Describes the packet at a human-readable level.

Expected shape:

```json
{
  "caseId": "w6-001-model-timeout",
  "category": "gateway_failure",
  "title": "Model timeout becomes retryable gateway failure",
  "purpose": "Verifies timeout is logged as RETRYABLE with MODEL_TIMEOUT."
}
```

Fields:

```txt
caseId    -> stable packet ID
category  -> eval category
title     -> short readable name
purpose   -> what production behavior this packet proves
```

### `input.json`

Defines the synthetic gateway call and fake provider behavior.

Expected shape:

```json
{
  "caseId": "w6-001-model-timeout",
  "gatewayInput": {
    "traceId": "trace_w6_001",
    "runId": null,
    "kind": "SYNTHETIC_GATEWAY_TEST",
    "provider": "synthetic",
    "model": "synthetic-model",
    "modelVersion": "synthetic-v1",
    "promptVersion": "synthetic_gateway_test_v1",
    "schemaVersion": "gateway_log_v1",
    "timeoutMs": 10,
    "latencyLimitMs": 1000,
    "costLimitUsd": 0.01,
    "inputJson": {
      "caseId": "w6-001-model-timeout"
    }
  },
  "syntheticCall": {
    "behavior": "timeout",
    "delayMs": 50
  }
}
```

Important parts:

```txt
gatewayInput.traceId        -> caller-provided trace ID, or null for trace generation tests
gatewayInput.runId          -> workflow run ID when available
gatewayInput.kind           -> type of AI call being observed
gatewayInput.provider       -> synthetic/provider name
gatewayInput.model          -> model label
gatewayInput.modelVersion   -> required governance metadata
gatewayInput.promptVersion  -> required prompt metadata
gatewayInput.schemaVersion  -> expected output/log schema version
gatewayInput.timeoutMs      -> timeout threshold for the packet
gatewayInput.latencyLimitMs -> latency warning threshold
gatewayInput.costLimitUsd   -> max allowed estimated cost
gatewayInput.inputJson      -> payload passed through the gateway
syntheticCall.behavior      -> fake provider behavior to simulate
syntheticCall.delayMs       -> artificial latency when needed
```

Possible synthetic behaviors:

```txt
success
timeout
invalid_json
provider_error
cost_limit_exceeded
latency_spike
prompt_version_regression
eval_score_dropped
missing_model_version
```

### `expected.json`

Defines what the gateway/eval layer should assert.

Expected shape:

```json
{
  "caseId": "w6-001-model-timeout",
  "expectedStatus": "RETRYABLE",
  "expectedFailureType": "MODEL_TIMEOUT",
  "expectedRetryable": true,
  "mustStoreTraceId": true,
  "mustGenerateTraceId": false,
  "mustStorePromptVersion": true,
  "mustStoreModelVersion": true,
  "mustRecordLatency": true,
  "mustRecordCost": true,
  "mustAppearInDashboard": true,
  "dashboardSeverity": "warning"
}
```

Fields:

```txt
expectedStatus          -> SUCCEEDED, FAILED, RETRYABLE, or BLOCKED
expectedFailureType     -> gateway failure/governance type, or null
expectedRetryable       -> whether retry is allowed
mustStoreTraceId        -> AiCallLog must contain a trace ID
mustGenerateTraceId     -> gateway must create trace ID if caller omitted it
mustStorePromptVersion  -> prompt version must be stored
mustStoreModelVersion   -> model version must be stored
mustRecordLatency       -> latency must be measured
mustRecordCost          -> cost must be estimated or recorded
mustAppearInDashboard   -> result should be dashboard-visible
dashboardSeverity       -> info, warning, or critical
```

---

## Packet categories

```txt
gateway_failure                 -> provider/model behavior failed
gateway_policy_block            -> gateway rule blocked the call
gateway_observability_warning   -> call succeeded but produced a warning signal
gateway_governance              -> required governance metadata or prompt behavior failed
eval_regression                 -> eval evidence shows quality dropped
trace_generation                -> gateway repairs missing trace metadata
```

---

## Packet list

| Packet | Category | Expected status | Expected failure type | What it tests |
| --- | --- | --- | --- | --- |
| `w6-001-model-timeout` | `gateway_failure` | `RETRYABLE` | `MODEL_TIMEOUT` | timeout is logged, classified, and marked retryable |
| `w6-002-invalid-json-response` | `gateway_failure` | `FAILED` | `INVALID_JSON_RESPONSE` | invalid model JSON becomes a hard parse failure |
| `w6-003-cost-limit-exceeded` | `gateway_policy_block` | `BLOCKED` | `COST_LIMIT_EXCEEDED` | gateway can block calls that exceed cost policy |
| `w6-004-provider-error` | `gateway_failure` | `RETRYABLE` | `PROVIDER_ERROR` | provider-side failures stay visible and retryable |
| `w6-005-latency-spike` | `gateway_observability_warning` | `SUCCEEDED` | `LATENCY_SPIKE` | slow successful calls still produce observability signal |
| `w6-006-prompt-version-regression` | `gateway_governance` | `FAILED` | `PROMPT_VERSION_REGRESSION` | prompt regressions are captured as governance failures |
| `w6-007-eval-score-dropped` | `eval_regression` | `FAILED` | `EVAL_SCORE_DROPPED` | eval quality drops become production risk signals |
| `w6-008-missing-trace-id` | `trace_generation` | `SUCCEEDED` | `null` | gateway generates and stores trace ID when missing |
| `w6-009-missing-model-version` | `gateway_governance` | `BLOCKED` | `MISSING_MODEL_VERSION` | governed calls cannot proceed without model version |

---

## Important behavior notes

### Missing trace ID should pass

`w6-008-missing-trace-id` should not fail only because the caller omitted `traceId`.

Expected behavior:

```txt
input traceId = null
-> gateway creates trace ID
-> AiCallLog stores generated trace ID
-> eval passes
```

### Latency spike should not automatically fail

`w6-005-latency-spike` should have:

```txt
status = SUCCEEDED
failureType = LATENCY_SPIKE
```

The model response is valid, so the call succeeds. The latency warning remains visible for dashboards and reports.

### Governance cases may not come from provider exceptions

`w6-006-prompt-version-regression`, `w6-007-eval-score-dropped`, and `w6-009-missing-model-version` represent production governance signals.

They prove the system can treat governance failures as first-class observability events, not only network/provider errors.

---

## `eval-runs/`

The `eval-runs/` folder contains synthetic aggregate summaries that show what dashboard-compatible results should look like.

Files:

```txt
synthetic-run-success.json
synthetic-run-failure.json
synthetic-run-cost-spike.json
synthetic-run-latency-spike.json
```

Expected shape:

```json
{
  "runId": "week6-synthetic-success",
  "suite": "week-06-gateway-observability",
  "label": "Synthetic success run",
  "totalCases": 9,
  "passedCases": 9,
  "failedCases": 0,
  "warningCases": 0,
  "passRate": 1,
  "metrics": {
    "costPerRunUsd": 0.01,
    "latencyP95Ms": 450,
    "modelErrorRate": 0,
    "invalidJsonRate": 0,
    "promptVersionRegressionRate": 0,
    "missingTraceRate": 0,
    "missingModelVersionRate": 0,
    "retryableFailureRate": 0,
    "blockedByCostPolicyRate": 0
  }
}
```

These files are fixtures for the dashboard/eval story. They are not claim packets.

---

## `eval-results/`

The `eval-results/` folder is reserved for generated eval output.

Expected generated files:

```txt
week-6-gateway-observability-eval.json
week-6-gateway-observability-eval.md
```

The JSON report should be machine-readable. The Markdown report should be human-readable.

---

## Metrics

The dataset should support these metrics:

```txt
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

Expected safety targets:

```txt
missing_trace_rate = 0
unclassified_failure_rate = 0
ungoverned_model_call_rate = 0
```

---

## Production value

This dataset proves that ClaimFlow AI is not only able to run an agentic workflow. It can also explain and audit the AI behavior around that workflow.

The system should be able to answer:

- which model and prompt version were used
- which call failed and why
- whether the failure can be retried
- whether the call was blocked by policy
- whether latency or cost crossed a threshold
- whether the output can be traced back to a specific run
- whether eval evidence shows a regression

That is the production-grade proof for Week 6:

```txt
AI behavior is observable, governed, and evaluable.
```

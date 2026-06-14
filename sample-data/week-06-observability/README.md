# Week 06 - Gateway Observability Dataset

This folder contains the Week 6 dataset for ClaimFlow AI's **AI gateway and observability** layer.

Week 6 does not add more claim adjudication logic. It adds the production-control layer around AI behavior:

```txt
model call
-> gateway wrapper
-> trace ID, model version, prompt version, cost, latency, tokens, status, and error type
-> AiCallLog row
-> eval report
-> dashboard-ready observability signal
```

The dataset is intentionally synthetic. It should not depend on real Gemini/provider failures because production failure behavior must be tested deterministically.

---

## Why this dataset exists

Previous weeks proved the claim workflow itself:

```txt
Week 1 -> extraction and validation
Week 2 -> human review workflow
Week 3 -> policy-grounded RAG
Week 4 -> safe agent action selection
Week 5 -> workflow memory from past corrections and review outcomes
```

Week 6 proves that the AI workflow is governed:

```txt
Every AI call is logged.
Every call has a trace ID.
Every call stores model and prompt versions.
Every call records latency and estimated cost.
Every failure is classified.
Retryable failures are distinguishable from hard failures.
Cost and governance policies can block unsafe calls.
Eval and dashboard layers can consume the same structured evidence.
```

This matters because ClaimFlow AI is an agentic workflow, but the agent does not act freely. It acts inside a system that can explain what model call happened, why it failed, whether it can be retried, what it cost, and which prompt/model version produced the output.

---

## Core rule

The gateway is not only a wrapper around model calls. It is the audit boundary for AI behavior.

The gateway must record:

```txt
traceId
runId, when available
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

The gateway must never:

```txt
silently drop model failures
hide invalid JSON failures
allow governed calls without model version
ignore cost limits
depend on real provider outages for eval coverage
make retryable and non-retryable failures look the same
produce dashboard data without traceability
```

---

## Folder structure

```txt
sample-data/week-06-observability/
  README.md

  eval-runs/
    synthetic-run-success.json
    synthetic-run-failure.json
    synthetic-run-cost-spike.json
    synthetic-run-latency-spike.json

  gateway-cases/
    w6-001-model-timeout/
      manifest.json
      input.json
      expected.json
      README.md

    w6-002-invalid-json-response/
      manifest.json
      input.json
      expected.json
      README.md

    w6-003-cost-limit-exceeded/
      manifest.json
      input.json
      expected.json
      README.md

    w6-004-provider-error/
      manifest.json
      input.json
      expected.json
      README.md

    w6-005-latency-spike/
      manifest.json
      input.json
      expected.json
      README.md

    w6-006-prompt-version-regression/
      manifest.json
      input.json
      expected.json
      README.md

    w6-007-eval-score-dropped/
      manifest.json
      input.json
      expected.json
      README.md

    w6-008-missing-trace-id/
      manifest.json
      input.json
      expected.json
      README.md

    w6-009-missing-model-version/
      manifest.json
      input.json
      expected.json
      README.md

  eval-results/
    .gitkeep
```

---

## How the dataset is used

The dataset is created.

Eval runner is added:

```txt
packages/evals/evaluate-week6-gateway-observability.ts
```

The eval runner :

```txt
1. Load every gateway case.
2. Execute synthetic gateway behavior where possible.
3. Compare actual gateway result with expected.json.
4. Verify AiCallLog fields.
5. Compute observability metrics.
6. Write dashboard-compatible JSON and Markdown reports.
```

Expected eval command:

```bash
bun run eval:week6:gateway
```

Expected eval outputs:

```txt
sample-data/week-06-observability/eval-results/week-6-gateway-observability-eval.json
sample-data/week-06-observability/eval-results/week-6-gateway-observability-eval.md
```

---

## Gateway case contract

Each packet has four files.

### `manifest.json`

Human-readable case metadata.

Example:

```json
{
  "caseId": "w6-001-model-timeout",
  "category": "gateway_failure",
  "title": "Model timeout becomes retryable gateway failure",
  "purpose": "Verifies timeout is logged as RETRYABLE with MODEL_TIMEOUT."
}
```

### `input.json`

Synthetic input for the gateway eval runner.

This file describes the gateway call plus the fake provider behavior. It should not call a real model.

Example:

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

### `expected.json`

Assertions the eval runner must check.

Example:

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

### `README.md`

Short explanation for the individual packet.

It should say:

```txt
what failure/signal is being tested
why that behavior matters
expected gateway status
expected failure type
whether the failure should be retryable
```

---

## Packet categories

```txt
gateway_failure
gateway_policy_block
gateway_observability_warning
gateway_governance
eval_regression
trace_generation
```

### `gateway_failure`

Tests failures caused by model/provider behavior:

```txt
timeout
invalid JSON
provider 500
```

### `gateway_policy_block`

Tests calls blocked by gateway policy:

```txt
estimated cost exceeds configured cost limit
```

### `gateway_observability_warning`

Tests calls that succeed but still need visibility:

```txt
latency spike on a valid model response
```

### `gateway_governance`

Tests governance failures:

```txt
missing model version
prompt version regression
```

### `eval_regression`

Tests eval-level regression behavior:

```txt
current eval score drops below expected threshold
```

### `trace_generation`

Tests trace hygiene:

```txt
caller omits traceId
gateway generates one
stored log still remains traceable
```

---

## Packet list

| Packet | Category | Expected status | Expected failure type | What it proves |
| --- | --- | --- | --- | --- |
| `w6-001-model-timeout` | `gateway_failure` | `RETRYABLE` | `MODEL_TIMEOUT` | Timeout is retryable and visible in logs. |
| `w6-002-invalid-json-response` | `gateway_failure` | `FAILED` | `INVALID_JSON_RESPONSE` | Bad model JSON is a hard parse failure. |
| `w6-003-cost-limit-exceeded` | `gateway_policy_block` | `BLOCKED` | `COST_LIMIT_EXCEEDED` | Cost policy can stop expensive model calls. |
| `w6-004-provider-error` | `gateway_failure` | `RETRYABLE` | `PROVIDER_ERROR` | Provider 500-style failures are retryable. |
| `w6-005-latency-spike` | `gateway_observability_warning` | `SUCCEEDED` | `LATENCY_SPIKE` | Slow successful calls are still observable. |
| `w6-006-prompt-version-regression` | `gateway_governance` | `FAILED` | `PROMPT_VERSION_REGRESSION` | Prompt regressions can be represented in eval/gateway evidence. |
| `w6-007-eval-score-dropped` | `eval_regression` | `FAILED` | `EVAL_SCORE_DROPPED` | Eval score drops are treated as production regressions. |
| `w6-008-missing-trace-id` | `trace_generation` | `SUCCEEDED` | `null` | Gateway generates trace ID when caller omits it. |
| `w6-009-missing-model-version` | `gateway_governance` | `BLOCKED` | `MISSING_MODEL_VERSION` | Governed calls cannot proceed without model version. |

---

## Important behavior notes

### Missing trace ID should pass

`w6-008-missing-trace-id` is not expected to fail.

The Day 2 gateway behavior generates a trace ID when one is missing:

```txt
input traceId = null
-> gateway creates trace_<uuid>
-> AiCallLog stores generated traceId
-> eval passes
```

This means `missing_trace_rate` should remain `0`.

### Latency spike should not automatically fail

`w6-005-latency-spike` is expected to have:

```txt
status = SUCCEEDED
errorType = LATENCY_SPIKE
```

The model response was valid, so the call succeeds. The latency warning is still stored so the dashboard can show that performance degraded.

### Prompt and eval regressions are governance cases

`w6-006-prompt-version-regression` and `w6-007-eval-score-dropped` may not come directly from a provider exception.

They represent production governance signals:

```txt
prompt version regressed
eval score dropped
```

The Week 6 eval runner can synthesize these as gateway-observable failures so they appear in reports and dashboards.

---

## `eval-runs/`

The `eval-runs/` folder contains small dashboard-compatible synthetic summaries.

These are not the final Day 4 eval reports. They are fixture-like examples that show how Week 6 results should look when later persisted into an eval dashboard.

Files:

```txt
synthetic-run-success.json
synthetic-run-failure.json
synthetic-run-cost-spike.json
synthetic-run-latency-spike.json
```

Each file should contain:

```txt
runId
suite
label
totalCases
passedCases
failedCases
warningCases
passRate
metrics
```

Example metrics:

```txt
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

These metrics are the bridge between gateway logs and the Day 5 eval dashboard.

---

## Expected Week 6 eval metrics

The Day 4 eval should compute:

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

Target behavior:

```txt
all 9 cases pass
missing_trace_rate = 0
missing_model_version_rate captures blocked governance case
retryable_failure_rate includes timeout and provider error
blocked_by_cost_policy_rate includes cost limit case
latency_p95 reflects latency spike case
invalid_json_rate includes invalid JSON case
```

---

## Safety and production value

This dataset proves that ClaimFlow AI can handle production AI failure modes in a controlled way.

It checks that:

```txt
model failures do not disappear
invalid JSON does not silently become valid state
provider errors are retryable
cost limits are enforced
latency is measured
trace IDs survive every call
model and prompt versions are auditable
gateway results are dashboard-compatible
```

This is what makes the Week 6 story production-grade:

```txt
The agent workflow is not only smart.
It is traceable, measurable, governed, and evaluable.
```

---

## Run commands

After Day 3 dataset creation, validate JSON files:

```bash
find sample-data/week-06-observability -name "*.json" -print0 \
  | xargs -0 -n1 node -e 'const fs=require("node:fs"); JSON.parse(fs.readFileSync(process.argv[1],"utf8")); console.log("valid", process.argv[1]);'
```

Run type checks:

```bash
bun run check-types
```

After Day 4, run:

```bash
bun run eval:week6:gateway
```

Expected output:

```txt
Week 6 Gateway Observability Eval
Cases: 9
Passed: 9
Failed: 0
Pass rate: 100%
```

---

## What Week 6 Day 3 proves

By the end of Day 3, ClaimFlow AI should have a complete deterministic observability dataset:

```txt
gateway failure cases exist
gateway governance cases exist
trace generation is tested
cost and latency behavior is tested
prompt/eval regressions are represented
dashboard fixture summaries exist
future Week 6 eval runner has a stable file contract
```

This completes the dataset layer for the final production-grade proof.

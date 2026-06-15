# Week 6 Gateway Observability Eval Report

Generated at: 2026-06-15T12:20:49.139Z

## Executive Summary

Week 6 gateway observability eval ran **9 cases**. **9 passed** and **0 failed**. Pass rate: **100.0%**.

This eval verifies that synthetic gateway failures become structured, dashboard-compatible observability evidence.

## Metric Table

| Metric | Value |
|---|---:|
| eval_pass_rate | 100.0% |
| cost_per_run | 20.0024 |
| latency_p95 | 372 |
| model_error_rate | 22.2% |
| invalid_json_rate | 11.1% |
| prompt_version_regression_rate | 11.1% |
| missing_trace_rate | 0.0% |
| missing_model_version_rate | 11.1% |
| retryable_failure_rate | 22.2% |
| blocked_by_cost_policy_rate | 11.1% |

## Case Matrix

| Case | Category | Result | Status | Failure type | Severity |
|---|---|---:|---|---|---|
| w6-001-model-timeout | gateway_failure | PASS | RETRYABLE | MODEL_TIMEOUT | warning |
| w6-002-invalid-json-response | gateway_failure | PASS | FAILED | INVALID_JSON_RESPONSE | error |
| w6-003-cost-limit-exceeded | gateway_policy_block | PASS | BLOCKED | COST_LIMIT_EXCEEDED | error |
| w6-004-provider-error | gateway_failure | PASS | RETRYABLE | PROVIDER_ERROR | warning |
| w6-005-latency-spike | gateway_observability_warning | PASS | SUCCEEDED | LATENCY_SPIKE | warning |
| w6-006-prompt-version-regression | gateway_governance | PASS | FAILED | PROMPT_VERSION_REGRESSION | error |
| w6-007-eval-score-dropped | eval_regression | PASS | FAILED | EVAL_SCORE_DROPPED | error |
| w6-008-missing-trace-id | trace_generation | PASS | SUCCEEDED | none | ok |
| w6-009-missing-model-version | gateway_governance | PASS | BLOCKED | MISSING_MODEL_VERSION | error |

## Detailed Case Results

### w6-001-model-timeout

**Title:** Model timeout becomes retryable gateway failure

**Result:** **PASS**

| Check | Result | Expected | Actual |
|---|---:|---|---|
| AiCallLog row exists | PASS | true | true |
| status matches expectedStatus | PASS | RETRYABLE | {"returned":"RETRYABLE","persisted":"RETRYABLE"} |
| errorType matches expectedFailureType | PASS | MODEL_TIMEOUT | {"returned":"MODEL_TIMEOUT","persisted":"MODEL_TIMEOUT","usedForAssertion":"MODEL_TIMEOUT"} |
| retryable matches expectedRetryable | PASS | true | {"returned":true,"persisted":true} |
| traceId exists when required | PASS | true | trace_w6_001 |
| traceId is generated when required | PASS | false | trace_w6_001 |
| promptVersion exists when required | PASS | true | synthetic_gateway_test_v1 |
| modelVersion exists when required | PASS | true | synthetic-v1 |
| latencyMs is recorded when required | PASS | true | 372 |
| estimatedCostUsd is recorded when required | PASS | true | 0 |
| case is dashboard-compatible | PASS | true | {"caseId":"w6-001-model-timeout","status":"RETRYABLE","severity":"warning","failureType":"MODEL_TIMEOUT","retryable":true,"latencyMs":372,"estimatedCostUsd":0,"traceId":"trace_w6_001","modelVersion":"synthetic-v1","promptVersion":"synthetic_gateway_test_v1","aiCallLogId":"cmqf6m0tf00004qy89hr0y51m","returnedStatus":"RETRYABLE","returnedFailureType":"MODEL_TIMEOUT","returnedRetryable":true,"returnedTraceId":"trace_w6_001"} |
| AiCallLog status matches returned gateway result | PASS | RETRYABLE | RETRYABLE |

### w6-002-invalid-json-response

**Title:** Invalid JSON response becomes failed gateway call

**Result:** **PASS**

| Check | Result | Expected | Actual |
|---|---:|---|---|
| AiCallLog row exists | PASS | true | true |
| status matches expectedStatus | PASS | FAILED | {"returned":"FAILED","persisted":"FAILED"} |
| errorType matches expectedFailureType | PASS | INVALID_JSON_RESPONSE | {"returned":"INVALID_JSON_RESPONSE","persisted":"INVALID_JSON_RESPONSE","usedForAssertion":"INVALID_JSON_RESPONSE"} |
| retryable matches expectedRetryable | PASS | false | {"returned":false,"persisted":false} |
| traceId exists when required | PASS | true | trace_w6_002 |
| traceId is generated when required | PASS | false | trace_w6_002 |
| promptVersion exists when required | PASS | true | synthetic_gateway_test_v1 |
| modelVersion exists when required | PASS | true | synthetic-v1 |
| latencyMs is recorded when required | PASS | true | 18 |
| estimatedCostUsd is recorded when required | PASS | true | 0 |
| case is dashboard-compatible | PASS | true | {"caseId":"w6-002-invalid-json-response","status":"FAILED","severity":"error","failureType":"INVALID_JSON_RESPONSE","retryable":false,"latencyMs":18,"estimatedCostUsd":0,"traceId":"trace_w6_002","modelVersion":"synthetic-v1","promptVersion":"synthetic_gateway_test_v1","aiCallLogId":"cmqf6m0yh00014qy8a17kwua6","returnedStatus":"FAILED","returnedFailureType":"INVALID_JSON_RESPONSE","returnedRetryable":false,"returnedTraceId":"trace_w6_002"} |
| AiCallLog status matches returned gateway result | PASS | FAILED | FAILED |

### w6-003-cost-limit-exceeded

**Title:** Cost limit exceeded blocks gateway call

**Result:** **PASS**

| Check | Result | Expected | Actual |
|---|---:|---|---|
| AiCallLog row exists | PASS | true | true |
| status matches expectedStatus | PASS | BLOCKED | {"returned":"BLOCKED","persisted":"BLOCKED"} |
| errorType matches expectedFailureType | PASS | COST_LIMIT_EXCEEDED | {"returned":"COST_LIMIT_EXCEEDED","persisted":"COST_LIMIT_EXCEEDED","usedForAssertion":"COST_LIMIT_EXCEEDED"} |
| retryable matches expectedRetryable | PASS | false | {"returned":false,"persisted":false} |
| traceId exists when required | PASS | true | trace_w6_003 |
| traceId is generated when required | PASS | false | trace_w6_003 |
| promptVersion exists when required | PASS | true | synthetic_gateway_test_v1 |
| modelVersion exists when required | PASS | true | synthetic-v1 |
| latencyMs is recorded when required | PASS | true | 12 |
| estimatedCostUsd is recorded when required | PASS | true | 20 |
| case is dashboard-compatible | PASS | true | {"caseId":"w6-003-cost-limit-exceeded","status":"BLOCKED","severity":"error","failureType":"COST_LIMIT_EXCEEDED","retryable":false,"latencyMs":12,"estimatedCostUsd":20,"traceId":"trace_w6_003","modelVersion":"synthetic-v1","promptVersion":"synthetic_gateway_test_v1","aiCallLogId":"cmqf6m0zq00024qy8g0fj2hj3","returnedStatus":"BLOCKED","returnedFailureType":"COST_LIMIT_EXCEEDED","returnedRetryable":false,"returnedTraceId":"trace_w6_003"} |
| AiCallLog status matches returned gateway result | PASS | BLOCKED | BLOCKED |

### w6-004-provider-error

**Title:** Provider 500 becomes retryable gateway failure

**Result:** **PASS**

| Check | Result | Expected | Actual |
|---|---:|---|---|
| AiCallLog row exists | PASS | true | true |
| status matches expectedStatus | PASS | RETRYABLE | {"returned":"RETRYABLE","persisted":"RETRYABLE"} |
| errorType matches expectedFailureType | PASS | PROVIDER_ERROR | {"returned":"PROVIDER_ERROR","persisted":"PROVIDER_ERROR","usedForAssertion":"PROVIDER_ERROR"} |
| retryable matches expectedRetryable | PASS | true | {"returned":true,"persisted":true} |
| traceId exists when required | PASS | true | trace_w6_004 |
| traceId is generated when required | PASS | false | trace_w6_004 |
| promptVersion exists when required | PASS | true | synthetic_gateway_test_v1 |
| modelVersion exists when required | PASS | true | synthetic-v1 |
| latencyMs is recorded when required | PASS | true | 7 |
| estimatedCostUsd is recorded when required | PASS | true | 0 |
| case is dashboard-compatible | PASS | true | {"caseId":"w6-004-provider-error","status":"RETRYABLE","severity":"warning","failureType":"PROVIDER_ERROR","retryable":true,"latencyMs":7,"estimatedCostUsd":0,"traceId":"trace_w6_004","modelVersion":"synthetic-v1","promptVersion":"synthetic_gateway_test_v1","aiCallLogId":"cmqf6m11d00034qy8sm8uekb2","returnedStatus":"RETRYABLE","returnedFailureType":"PROVIDER_ERROR","returnedRetryable":true,"returnedTraceId":"trace_w6_004"} |
| AiCallLog status matches returned gateway result | PASS | RETRYABLE | RETRYABLE |

### w6-005-latency-spike

**Title:** Latency spike is visible on successful gateway call

**Result:** **PASS**

| Check | Result | Expected | Actual |
|---|---:|---|---|
| AiCallLog row exists | PASS | true | true |
| status matches expectedStatus | PASS | SUCCEEDED | {"returned":"SUCCEEDED","persisted":"SUCCEEDED"} |
| errorType matches expectedFailureType | PASS | LATENCY_SPIKE | {"returned":null,"persisted":"LATENCY_SPIKE","usedForAssertion":"LATENCY_SPIKE"} |
| retryable matches expectedRetryable | PASS | false | {"returned":false,"persisted":false} |
| traceId exists when required | PASS | true | trace_w6_005 |
| traceId is generated when required | PASS | false | trace_w6_005 |
| promptVersion exists when required | PASS | true | synthetic_gateway_test_v1 |
| modelVersion exists when required | PASS | true | synthetic-v1 |
| latencyMs is recorded when required | PASS | true | 39 |
| estimatedCostUsd is recorded when required | PASS | true | 0.0012 |
| case is dashboard-compatible | PASS | true | {"caseId":"w6-005-latency-spike","status":"SUCCEEDED","severity":"warning","failureType":"LATENCY_SPIKE","retryable":false,"latencyMs":39,"estimatedCostUsd":0.0012,"traceId":"trace_w6_005","modelVersion":"synthetic-v1","promptVersion":"synthetic_gateway_test_v1","aiCallLogId":"cmqf6m12200044qy8624tc4jt","returnedStatus":"SUCCEEDED","returnedFailureType":null,"returnedRetryable":false,"returnedTraceId":"trace_w6_005"} |
| AiCallLog status matches returned gateway result | PASS | SUCCEEDED | SUCCEEDED |

### w6-006-prompt-version-regression

**Title:** Prompt version regression is detected

**Result:** **PASS**

| Check | Result | Expected | Actual |
|---|---:|---|---|
| AiCallLog row exists | PASS | true | true |
| status matches expectedStatus | PASS | FAILED | {"returned":"FAILED","persisted":"FAILED"} |
| errorType matches expectedFailureType | PASS | PROMPT_VERSION_REGRESSION | {"returned":"PROMPT_VERSION_REGRESSION","persisted":"PROMPT_VERSION_REGRESSION","usedForAssertion":"PROMPT_VERSION_REGRESSION"} |
| retryable matches expectedRetryable | PASS | false | {"returned":false,"persisted":false} |
| traceId exists when required | PASS | true | trace_w6_006 |
| traceId is generated when required | PASS | false | trace_w6_006 |
| promptVersion exists when required | PASS | true | synthetic_gateway_test_v0 |
| modelVersion exists when required | PASS | true | synthetic-v1 |
| latencyMs is recorded when required | PASS | true | 4 |
| estimatedCostUsd is recorded when required | PASS | true | 0 |
| case is dashboard-compatible | PASS | true | {"caseId":"w6-006-prompt-version-regression","status":"FAILED","severity":"error","failureType":"PROMPT_VERSION_REGRESSION","retryable":false,"latencyMs":4,"estimatedCostUsd":0,"traceId":"trace_w6_006","modelVersion":"synthetic-v1","promptVersion":"synthetic_gateway_test_v0","aiCallLogId":"cmqf6m14400054qy8dy03xd7b","returnedStatus":"FAILED","returnedFailureType":"PROMPT_VERSION_REGRESSION","returnedRetryable":false,"returnedTraceId":"trace_w6_006"} |
| AiCallLog status matches returned gateway result | PASS | FAILED | FAILED |

### w6-007-eval-score-dropped

**Title:** Eval score drop is represented as observability failure

**Result:** **PASS**

| Check | Result | Expected | Actual |
|---|---:|---|---|
| AiCallLog row exists | PASS | true | true |
| status matches expectedStatus | PASS | FAILED | {"returned":"FAILED","persisted":"FAILED"} |
| errorType matches expectedFailureType | PASS | EVAL_SCORE_DROPPED | {"returned":"EVAL_SCORE_DROPPED","persisted":"EVAL_SCORE_DROPPED","usedForAssertion":"EVAL_SCORE_DROPPED"} |
| retryable matches expectedRetryable | PASS | false | {"returned":false,"persisted":false} |
| traceId exists when required | PASS | true | trace_w6_007 |
| traceId is generated when required | PASS | false | trace_w6_007 |
| promptVersion exists when required | PASS | true | synthetic_gateway_test_v1 |
| modelVersion exists when required | PASS | true | synthetic-v1 |
| latencyMs is recorded when required | PASS | true | 6 |
| estimatedCostUsd is recorded when required | PASS | true | 0 |
| case is dashboard-compatible | PASS | true | {"caseId":"w6-007-eval-score-dropped","status":"FAILED","severity":"error","failureType":"EVAL_SCORE_DROPPED","retryable":false,"latencyMs":6,"estimatedCostUsd":0,"traceId":"trace_w6_007","modelVersion":"synthetic-v1","promptVersion":"synthetic_gateway_test_v1","aiCallLogId":"cmqf6m14n00064qy88zwi2nyo","returnedStatus":"FAILED","returnedFailureType":"EVAL_SCORE_DROPPED","returnedRetryable":false,"returnedTraceId":"trace_w6_007"} |
| AiCallLog status matches returned gateway result | PASS | FAILED | FAILED |

### w6-008-missing-trace-id

**Title:** Missing trace ID is generated by gateway

**Result:** **PASS**

| Check | Result | Expected | Actual |
|---|---:|---|---|
| AiCallLog row exists | PASS | true | true |
| status matches expectedStatus | PASS | SUCCEEDED | {"returned":"SUCCEEDED","persisted":"SUCCEEDED"} |
| errorType matches expectedFailureType | PASS | none | {"returned":null,"persisted":null,"usedForAssertion":null} |
| retryable matches expectedRetryable | PASS | false | {"returned":false,"persisted":false} |
| traceId exists when required | PASS | true | trace_67170ce8-410d-4c93-9e00-9521c35190de |
| traceId is generated when required | PASS | true | trace_67170ce8-410d-4c93-9e00-9521c35190de |
| promptVersion exists when required | PASS | true | synthetic_gateway_test_v1 |
| modelVersion exists when required | PASS | true | synthetic-v1 |
| latencyMs is recorded when required | PASS | true | 3 |
| estimatedCostUsd is recorded when required | PASS | true | 0.0012 |
| case is dashboard-compatible | PASS | true | {"caseId":"w6-008-missing-trace-id","status":"SUCCEEDED","severity":"ok","failureType":null,"retryable":false,"latencyMs":3,"estimatedCostUsd":0.0012,"traceId":"trace_67170ce8-410d-4c93-9e00-9521c35190de","modelVersion":"synthetic-v1","promptVersion":"synthetic_gateway_test_v1","aiCallLogId":"cmqf6m15700074qy8w8nkug8u","returnedStatus":"SUCCEEDED","returnedFailureType":null,"returnedRetryable":false,"returnedTraceId":"trace_67170ce8-410d-4c93-9e00-9521c35190de"} |
| AiCallLog status matches returned gateway result | PASS | SUCCEEDED | SUCCEEDED |

### w6-009-missing-model-version

**Title:** Missing model version is blocked

**Result:** **PASS**

| Check | Result | Expected | Actual |
|---|---:|---|---|
| AiCallLog row exists | PASS | true | true |
| status matches expectedStatus | PASS | BLOCKED | {"returned":"BLOCKED","persisted":"BLOCKED"} |
| errorType matches expectedFailureType | PASS | MISSING_MODEL_VERSION | {"returned":"MISSING_MODEL_VERSION","persisted":"MISSING_MODEL_VERSION","usedForAssertion":"MISSING_MODEL_VERSION"} |
| retryable matches expectedRetryable | PASS | false | {"returned":false,"persisted":false} |
| traceId exists when required | PASS | true | trace_w6_009 |
| traceId is generated when required | PASS | false | trace_w6_009 |
| promptVersion exists when required | PASS | true | synthetic_gateway_test_v1 |
| modelVersion exists when required | PASS | false | none |
| latencyMs is recorded when required | PASS | true | 7 |
| estimatedCostUsd is recorded when required | PASS | true | 0 |
| case is dashboard-compatible | PASS | true | {"caseId":"w6-009-missing-model-version","status":"BLOCKED","severity":"error","failureType":"MISSING_MODEL_VERSION","retryable":false,"latencyMs":7,"estimatedCostUsd":0,"traceId":"trace_w6_009","modelVersion":null,"promptVersion":"synthetic_gateway_test_v1","aiCallLogId":"cmqf6m15r00084qy8zkedz7e1","returnedStatus":"BLOCKED","returnedFailureType":"MISSING_MODEL_VERSION","returnedRetryable":false,"returnedTraceId":"trace_w6_009"} |
| AiCallLog status matches returned gateway result | PASS | BLOCKED | BLOCKED |

## Production Proof

This report proves the Week 6 gateway layer can:

- classify model/provider failures
- distinguish retryable and non-retryable failures
- block calls through cost and governance policy
- preserve trace, model, prompt, latency, and cost metadata
- generate dashboard-ready case and metric evidence


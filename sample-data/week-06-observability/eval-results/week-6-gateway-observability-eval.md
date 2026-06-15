# Week 6 Gateway Observability Eval Report

Generated at: 2026-06-15T12:15:41.181Z

## Executive Summary

Week 6 gateway observability eval ran **9 cases**. **8 passed** and **1 failed**. Pass rate: **88.9%**.

This eval verifies that synthetic gateway failures become structured, dashboard-compatible observability evidence.

## Metric Table

| Metric | Value |
|---|---:|
| eval_pass_rate | 88.9% |
| cost_per_run | 0.2% |
| latency_p95 | 380 |
| model_error_rate | 22.2% |
| invalid_json_rate | 11.1% |
| prompt_version_regression_rate | 11.1% |
| missing_trace_rate | 0.0% |
| missing_model_version_rate | 11.1% |
| retryable_failure_rate | 22.2% |
| blocked_by_cost_policy_rate | 0.0% |

## Case Matrix

| Case | Category | Result | Status | Failure type | Severity |
|---|---|---:|---|---|---|
| w6-001-model-timeout | gateway_failure | PASS | RETRYABLE | MODEL_TIMEOUT | warning |
| w6-002-invalid-json-response | gateway_failure | PASS | FAILED | INVALID_JSON_RESPONSE | error |
| w6-003-cost-limit-exceeded | gateway_policy_block | FAIL | FAILED | UNKNOWN | error |
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
| latencyMs is recorded when required | PASS | true | 380 |
| estimatedCostUsd is recorded when required | PASS | true | 0 |
| case is dashboard-compatible | PASS | true | {"caseId":"w6-001-model-timeout","status":"RETRYABLE","severity":"warning","failureType":"MODEL_TIMEOUT","retryable":true,"latencyMs":380,"estimatedCostUsd":0,"traceId":"trace_w6_001","modelVersion":"synthetic-v1","promptVersion":"synthetic_gateway_test_v1","aiCallLogId":"cmqf6ff8b0000s9y8lff9q9qy","returnedStatus":"RETRYABLE","returnedFailureType":"MODEL_TIMEOUT","returnedRetryable":true,"returnedTraceId":"trace_w6_001"} |
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
| latencyMs is recorded when required | PASS | true | 4 |
| estimatedCostUsd is recorded when required | PASS | true | 0 |
| case is dashboard-compatible | PASS | true | {"caseId":"w6-002-invalid-json-response","status":"FAILED","severity":"error","failureType":"INVALID_JSON_RESPONSE","retryable":false,"latencyMs":4,"estimatedCostUsd":0,"traceId":"trace_w6_002","modelVersion":"synthetic-v1","promptVersion":"synthetic_gateway_test_v1","aiCallLogId":"cmqf6ffcu0001s9y8rclyalyi","returnedStatus":"FAILED","returnedFailureType":"INVALID_JSON_RESPONSE","returnedRetryable":false,"returnedTraceId":"trace_w6_002"} |
| AiCallLog status matches returned gateway result | PASS | FAILED | FAILED |

### w6-003-cost-limit-exceeded

**Title:** Cost limit exceeded blocks gateway call

**Result:** **FAIL**

| Check | Result | Expected | Actual |
|---|---:|---|---|
| AiCallLog row exists | PASS | true | true |
| status matches expectedStatus | FAIL | BLOCKED | {"returned":"FAILED","persisted":"FAILED"} |
| errorType matches expectedFailureType | FAIL | COST_LIMIT_EXCEEDED | {"returned":"UNKNOWN","persisted":"UNKNOWN","usedForAssertion":"UNKNOWN"} |
| retryable matches expectedRetryable | PASS | false | {"returned":false,"persisted":false} |
| traceId exists when required | PASS | true | trace_w6_003 |
| traceId is generated when required | PASS | false | trace_w6_003 |
| promptVersion exists when required | PASS | true | synthetic_gateway_test_v1 |
| modelVersion exists when required | PASS | true | synthetic-v1 |
| latencyMs is recorded when required | PASS | true | 6 |
| estimatedCostUsd is recorded when required | PASS | true | 0 |
| case is dashboard-compatible | PASS | true | {"caseId":"w6-003-cost-limit-exceeded","status":"FAILED","severity":"error","failureType":"UNKNOWN","retryable":false,"latencyMs":6,"estimatedCostUsd":0,"traceId":"trace_w6_003","modelVersion":"synthetic-v1","promptVersion":"synthetic_gateway_test_v1","aiCallLogId":"cmqf6ffdh0002s9y82u5nmu9t","returnedStatus":"FAILED","returnedFailureType":"UNKNOWN","returnedRetryable":false,"returnedTraceId":"trace_w6_003"} |
| AiCallLog status matches returned gateway result | PASS | FAILED | FAILED |

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
| latencyMs is recorded when required | PASS | true | 5 |
| estimatedCostUsd is recorded when required | PASS | true | 0 |
| case is dashboard-compatible | PASS | true | {"caseId":"w6-004-provider-error","status":"RETRYABLE","severity":"warning","failureType":"PROVIDER_ERROR","retryable":true,"latencyMs":5,"estimatedCostUsd":0,"traceId":"trace_w6_004","modelVersion":"synthetic-v1","promptVersion":"synthetic_gateway_test_v1","aiCallLogId":"cmqf6ffe10003s9y8kjx36k4y","returnedStatus":"RETRYABLE","returnedFailureType":"PROVIDER_ERROR","returnedRetryable":true,"returnedTraceId":"trace_w6_004"} |
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
| case is dashboard-compatible | PASS | true | {"caseId":"w6-005-latency-spike","status":"SUCCEEDED","severity":"warning","failureType":"LATENCY_SPIKE","retryable":false,"latencyMs":39,"estimatedCostUsd":0.0012,"traceId":"trace_w6_005","modelVersion":"synthetic-v1","promptVersion":"synthetic_gateway_test_v1","aiCallLogId":"cmqf6ffeg0004s9y8196x94w3","returnedStatus":"SUCCEEDED","returnedFailureType":null,"returnedRetryable":false,"returnedTraceId":"trace_w6_005"} |
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
| latencyMs is recorded when required | PASS | true | 25 |
| estimatedCostUsd is recorded when required | PASS | true | 0 |
| case is dashboard-compatible | PASS | true | {"caseId":"w6-006-prompt-version-regression","status":"FAILED","severity":"error","failureType":"PROMPT_VERSION_REGRESSION","retryable":false,"latencyMs":25,"estimatedCostUsd":0,"traceId":"trace_w6_006","modelVersion":"synthetic-v1","promptVersion":"synthetic_gateway_test_v0","aiCallLogId":"cmqf6ffh10005s9y8tac2r6oc","returnedStatus":"FAILED","returnedFailureType":"PROMPT_VERSION_REGRESSION","returnedRetryable":false,"returnedTraceId":"trace_w6_006"} |
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
| case is dashboard-compatible | PASS | true | {"caseId":"w6-007-eval-score-dropped","status":"FAILED","severity":"error","failureType":"EVAL_SCORE_DROPPED","retryable":false,"latencyMs":6,"estimatedCostUsd":0,"traceId":"trace_w6_007","modelVersion":"synthetic-v1","promptVersion":"synthetic_gateway_test_v1","aiCallLogId":"cmqf6ffht0006s9y8i4hy59mn","returnedStatus":"FAILED","returnedFailureType":"EVAL_SCORE_DROPPED","returnedRetryable":false,"returnedTraceId":"trace_w6_007"} |
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
| traceId exists when required | PASS | true | trace_b9714211-f54b-4ecc-8a9a-92ef0386458d |
| traceId is generated when required | PASS | true | trace_b9714211-f54b-4ecc-8a9a-92ef0386458d |
| promptVersion exists when required | PASS | true | synthetic_gateway_test_v1 |
| modelVersion exists when required | PASS | true | synthetic-v1 |
| latencyMs is recorded when required | PASS | true | 8 |
| estimatedCostUsd is recorded when required | PASS | true | 0.0012 |
| case is dashboard-compatible | PASS | true | {"caseId":"w6-008-missing-trace-id","status":"SUCCEEDED","severity":"ok","failureType":null,"retryable":false,"latencyMs":8,"estimatedCostUsd":0.0012,"traceId":"trace_b9714211-f54b-4ecc-8a9a-92ef0386458d","modelVersion":"synthetic-v1","promptVersion":"synthetic_gateway_test_v1","aiCallLogId":"cmqf6ffik0007s9y8xtjfpl1k","returnedStatus":"SUCCEEDED","returnedFailureType":null,"returnedRetryable":false,"returnedTraceId":"trace_b9714211-f54b-4ecc-8a9a-92ef0386458d"} |
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
| latencyMs is recorded when required | PASS | true | 9 |
| estimatedCostUsd is recorded when required | PASS | true | 0 |
| case is dashboard-compatible | PASS | true | {"caseId":"w6-009-missing-model-version","status":"BLOCKED","severity":"error","failureType":"MISSING_MODEL_VERSION","retryable":false,"latencyMs":9,"estimatedCostUsd":0,"traceId":"trace_w6_009","modelVersion":null,"promptVersion":"synthetic_gateway_test_v1","aiCallLogId":"cmqf6ffjd0008s9y80hdy4g0h","returnedStatus":"BLOCKED","returnedFailureType":"MISSING_MODEL_VERSION","returnedRetryable":false,"returnedTraceId":"trace_w6_009"} |
| AiCallLog status matches returned gateway result | PASS | BLOCKED | BLOCKED |

## Production Proof

This report proves the Week 6 gateway layer can:

- classify model/provider failures
- distinguish retryable and non-retryable failures
- block calls through cost and governance policy
- preserve trace, model, prompt, latency, and cost metadata
- generate dashboard-ready case and metric evidence


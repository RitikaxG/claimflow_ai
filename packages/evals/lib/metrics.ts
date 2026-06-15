export type Week6GatewayMetricInput = {
  passed: boolean;
  actual: {
    status: string | null;
    failureType: string | null;
    retryable: boolean | null;
    latencyMs: number | null;
    estimatedCostUsd: number | null;
    traceId: string | null;
    modelVersion: string | null;
  };
};

export type Week6GatewayMetrics = {
  eval_pass_rate: number | null;
  cost_per_run: number;
  latency_p95: number | null;
  model_error_rate: number | null;
  invalid_json_rate: number | null;
  prompt_version_regression_rate: number | null;
  missing_trace_rate: number | null;
  missing_model_version_rate: number | null;
  retryable_failure_rate: number | null;
  blocked_by_cost_policy_rate: number | null;
};

export function rate(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

export function percentile(values: number[], targetPercentile: number): number | null {
  const sorted = values
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

  if (sorted.length === 0) return null;

  const rank = Math.ceil((targetPercentile / 100) * sorted.length) - 1;
  const index = Math.min(Math.max(rank, 0), sorted.length - 1);

  return sorted[index] ?? null;
}

export function formatPercent(value: number | null): string {
  return value === null ? "skipped" : `${(value * 100).toFixed(1)}%`;
}

export function summarizeWeek6GatewayMetrics(
  results: Week6GatewayMetricInput[],
): Week6GatewayMetrics {
  const total = results.length;

  const failureTypes = results.map((result) => result.actual.failureType);
  const statuses = results.map((result) => result.actual.status);

  const costs = results
    .map((result) => result.actual.estimatedCostUsd)
    .filter((value): value is number => typeof value === "number");

  const latencies = results
    .map((result) => result.actual.latencyMs)
    .filter((value): value is number => typeof value === "number");

  return {
    eval_pass_rate: rate(
      results.filter((result) => result.passed).length,
      total,
    ),
    cost_per_run: costs.reduce((sum, value) => sum + value, 0),
    latency_p95: percentile(latencies, 95),
    model_error_rate: rate(
      failureTypes.filter(
        (failureType) =>
          failureType === "MODEL_TIMEOUT" || failureType === "PROVIDER_ERROR",
      ).length,
      total,
    ),
    invalid_json_rate: rate(
      failureTypes.filter(
        (failureType) => failureType === "INVALID_JSON_RESPONSE",
      ).length,
      total,
    ),
    prompt_version_regression_rate: rate(
      failureTypes.filter(
        (failureType) => failureType === "PROMPT_VERSION_REGRESSION",
      ).length,
      total,
    ),
    missing_trace_rate: rate(
      results.filter((result) => !result.actual.traceId).length,
      total,
    ),
    missing_model_version_rate: rate(
      failureTypes.filter(
        (failureType) => failureType === "MISSING_MODEL_VERSION",
      ).length,
      total,
    ),
    retryable_failure_rate: rate(
      results.filter((result) => result.actual.retryable === true).length,
      total,
    ),
    blocked_by_cost_policy_rate: rate(
      statuses.filter((status, index) => {
        return (
          status === "BLOCKED" &&
          failureTypes[index] === "COST_LIMIT_EXCEEDED"
        );
      }).length,
      total,
    ),
  };
}
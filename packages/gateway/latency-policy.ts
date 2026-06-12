export function isLatencySpike(input: {
  latencyMs: number;
  latencyLimitMs?: number | null;
}) {
  if (input.latencyLimitMs === undefined || input.latencyLimitMs === null) {
    return false;
  }

  return input.latencyMs > input.latencyLimitMs;
}
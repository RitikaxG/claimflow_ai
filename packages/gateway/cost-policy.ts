export type GatewayCostEstimateInput = {
  inputTokens?: number | null;
  outputTokens?: number | null;
  inputTokenCostPer1M?: number;
  outputTokenCostPer1M?: number;
};

export function estimateCostUsd(input: GatewayCostEstimateInput): number {
  const inputTokens = input.inputTokens ?? 0;
  const outputTokens = input.outputTokens ?? 0;

  const inputRate = input.inputTokenCostPer1M ?? 0;
  const outputRate = input.outputTokenCostPer1M ?? 0;

  const cost =
    (inputTokens / 1_000_000) * inputRate +
    (outputTokens / 1_000_000) * outputRate;

  return Number(cost.toFixed(8));
}

export function exceedsCostLimit(input: {
  estimatedCostUsd: number;
  costLimitUsd?: number | null;
}) {
  if (input.costLimitUsd === undefined || input.costLimitUsd === null) {
    return false;
  }

  return input.estimatedCostUsd > input.costLimitUsd;
}
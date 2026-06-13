function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function extractGeminiUsage(response: { usageMetadata?: unknown }) {
  const usage = response.usageMetadata;

  if (!isRecord(usage)) {
    return {
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
    };
  }

  return {
    inputTokens: getNumber(usage.promptTokenCount),
    outputTokens: getNumber(usage.candidatesTokenCount),
    totalTokens: getNumber(usage.totalTokenCount),
  };
}
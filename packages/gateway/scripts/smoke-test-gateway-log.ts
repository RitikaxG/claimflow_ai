import { prisma } from "@repo/db";
import { createAiCallLog } from "../ai-gateway";
import { estimateCostUsd } from "../cost-policy";

async function main() {
  const traceId = `trace_w6_day1_${Date.now()}`;

  const successCost = estimateCostUsd({
    inputTokens: 1200,
    outputTokens: 300,
    inputTokenCostPer1M: 0.15,
    outputTokenCostPer1M: 0.6,
  });

  const success = await createAiCallLog({
    traceId,
    kind: "SYNTHETIC_GATEWAY_TEST",
    status: "SUCCEEDED",
    provider: "synthetic",
    model: "synthetic-gateway-model",
    modelVersion: "synthetic-v1",
    promptVersion: "synthetic_gateway_test_v1",
    schemaVersion: "gateway_log_v1",
    inputJson: {
      caseId: "w6-day1-success",
      message: "Synthetic successful AI call log.",
    },
    outputJson: {
      ok: true,
    },
    parsedOutputJson: {
      decision: "LOG_CREATED",
    },
    latencyMs: 124,
    inputTokens: 1200,
    outputTokens: 300,
    totalTokens: 1500,
    estimatedCostUsd: successCost,
    metadata: {
      smokeTest: true,
      expected: "success log should be stored",
    },
  });

  const failed = await createAiCallLog({
    traceId,
    kind: "SYNTHETIC_GATEWAY_TEST",
    status: "FAILED",
    provider: "synthetic",
    model: "synthetic-gateway-model",
    modelVersion: "synthetic-v1",
    promptVersion: "synthetic_gateway_test_v1",
    schemaVersion: "gateway_log_v1",
    inputJson: {
      caseId: "w6-day1-invalid-json",
      message: "Synthetic failed AI call log.",
    },
    outputJson: {
      rawText: "{ invalid json",
    },
    errorType: "INVALID_JSON_RESPONSE",
    errorMessage: "Synthetic invalid JSON response.",
    retryable: false,
    latencyMs: 88,
    inputTokens: 900,
    outputTokens: 120,
    totalTokens: 1020,
    estimatedCostUsd: estimateCostUsd({
      inputTokens: 900,
      outputTokens: 120,
      inputTokenCostPer1M: 0.15,
      outputTokenCostPer1M: 0.6,
    }),
    metadata: {
      smokeTest: true,
      expected: "failure log should be stored",
    },
  });

  const count = await prisma.aiCallLog.count({
    where: {
      traceId,
    },
  });

  console.log("Week 6 Day 1 Gateway Smoke Test");
  console.log(`Trace ID: ${traceId}`);
  console.log(`Created logs: ${count}`);
  console.log(`Success log: ${success.id}`);
  console.log(`Failed log: ${failed.id}`);

  if (count !== 2) {
    throw new Error(`Expected 2 gateway logs, found ${count}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
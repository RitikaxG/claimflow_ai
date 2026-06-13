import { z } from "zod";
import { prisma } from "@repo/db";
import { callModelThroughGateway } from "../ai-gateway";

const SyntheticSchema = z.object({
  decision: z.literal("OK"),
});

async function main() {
  const traceId = `trace_w6_day2_${Date.now()}`;

  const success = await callModelThroughGateway({
    traceId,
    kind: "SYNTHETIC_GATEWAY_TEST",
    provider: "synthetic",
    model: "synthetic-model",
    modelVersion: "synthetic-v1",
    promptVersion: "synthetic_gateway_test_v1",
    schemaVersion: "synthetic_schema_v1",
    inputJson: { caseId: "success" },
    expectedJson: SyntheticSchema,
    call: async () => ({
      responseText: JSON.stringify({ decision: "OK" }),
      outputJson: { text: JSON.stringify({ decision: "OK" }) },
      inputTokens: 100,
      outputTokens: 20,
      totalTokens: 120,
    }),
  });

  const invalidJson = await callModelThroughGateway({
    traceId,
    kind: "SYNTHETIC_GATEWAY_TEST",
    provider: "synthetic",
    model: "synthetic-model",
    modelVersion: "synthetic-v1",
    promptVersion: "synthetic_gateway_test_v1",
    schemaVersion: "synthetic_schema_v1",
    inputJson: { caseId: "invalid-json" },
    expectedJson: SyntheticSchema,
    call: async () => ({
      responseText: "{ invalid json",
      outputJson: { text: "{ invalid json" },
    }),
  });

  const missingModelVersion = await callModelThroughGateway({
    traceId,
    kind: "SYNTHETIC_GATEWAY_TEST",
    provider: "synthetic",
    model: "synthetic-model",
    modelVersion: null,
    promptVersion: "synthetic_gateway_test_v1",
    schemaVersion: "synthetic_schema_v1",
    inputJson: { caseId: "missing-model-version" },
    call: async () => ({
      parsedOutputJson: { decision: "OK" },
    }),
  });

  const logs = await prisma.aiCallLog.findMany({
    where: { traceId },
    orderBy: { createdAt: "asc" },
  });

  console.log("Week 6 Day 2 Gateway Wrapper Smoke Test");
  console.log(`Trace ID: ${traceId}`);
  console.log(`Logs: ${logs.length}`);
  console.log({
    success: success.status,
    invalidJson: invalidJson.status,
    missingModelVersion: missingModelVersion.status,
  });

  if (success.status !== "SUCCEEDED") {
    throw new Error("Expected success case to SUCCEED.");
  }

  if (invalidJson.status !== "FAILED") {
    throw new Error("Expected invalid JSON case to FAIL.");
  }

  if (missingModelVersion.status !== "BLOCKED") {
    throw new Error("Expected missing model version case to be BLOCKED.");
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
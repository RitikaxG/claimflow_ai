import { z } from "zod";
import { prisma } from "@repo/db";
import { callModelThroughGateway, PROMPT_REGISTRY } from "../index";

const SyntheticSchema = z.object({
  decision: z.literal("OK"),
});

type ExpectedCase = {
  caseId: string;
  expectedStatus: "SUCCEEDED" | "FAILED" | "RETRYABLE" | "BLOCKED";
  expectedErrorType?: string | null;
};

const syntheticPrompt = PROMPT_REGISTRY.syntheticGatewayTest;

async function main() {
  const traceId = `trace_w6_day2_wrapper_${Date.now()}`;

  // Make the cost-limit test deterministic even if env vars are not set.
  process.env.GATEWAY_INPUT_TOKEN_COST_PER_1M = "10";
  process.env.GATEWAY_OUTPUT_TOKEN_COST_PER_1M = "10";

  const expectedCases: ExpectedCase[] = [
    {
      caseId: "success",
      expectedStatus: "SUCCEEDED",
      expectedErrorType: null,
    },
    {
      caseId: "invalid-json",
      expectedStatus: "FAILED",
      expectedErrorType: "INVALID_JSON_RESPONSE",
    },
    {
      caseId: "missing-model-version",
      expectedStatus: "BLOCKED",
      expectedErrorType: "MISSING_MODEL_VERSION",
    },
    {
      caseId: "timeout",
      expectedStatus: "RETRYABLE",
      expectedErrorType: "MODEL_TIMEOUT",
    },
    {
      caseId: "provider-500",
      expectedStatus: "RETRYABLE",
      expectedErrorType: "PROVIDER_ERROR",
    },
    {
      caseId: "cost-limit-exceeded",
      expectedStatus: "BLOCKED",
      expectedErrorType: "COST_LIMIT_EXCEEDED",
    },
  ];

  const success = await callModelThroughGateway({
    traceId,
    kind: syntheticPrompt.kind,
    provider: "synthetic",
    model: "synthetic-model",
    modelVersion: "synthetic-v1",
    promptVersion: syntheticPrompt.promptVersion,
    schemaVersion: syntheticPrompt.schemaVersion,
    inputJson: {
      caseId: "success",
      expected: "Gateway should log STARTED then SUCCEEDED.",
    },
    expectedJson: SyntheticSchema,
    call: async () => ({
      responseText: JSON.stringify({ decision: "OK" }),
      outputJson: {
        text: JSON.stringify({ decision: "OK" }),
      },
      inputTokens: 100,
      outputTokens: 20,
      totalTokens: 120,
      metadata: {
        syntheticCase: "success",
      },
    }),
  });

  const invalidJson = await callModelThroughGateway({
    traceId,
    kind: syntheticPrompt.kind,
    provider: "synthetic",
    model: "synthetic-model",
    modelVersion: "synthetic-v1",
    promptVersion: syntheticPrompt.promptVersion,
    schemaVersion: syntheticPrompt.schemaVersion,
    inputJson: {
      caseId: "invalid-json",
      expected: "Gateway should log STARTED then FAILED.",
    },
    expectedJson: SyntheticSchema,
    call: async () => ({
      responseText: "{ invalid json",
      outputJson: {
        text: "{ invalid json",
      },
      metadata: {
        syntheticCase: "invalid-json",
      },
    }),
  });

  const missingModelVersion = await callModelThroughGateway({
    traceId,
    kind: syntheticPrompt.kind,
    provider: "synthetic",
    model: "synthetic-model",
    modelVersion: null,
    promptVersion: syntheticPrompt.promptVersion,
    schemaVersion: syntheticPrompt.schemaVersion,
    inputJson: {
      caseId: "missing-model-version",
      expected: "Gateway should log STARTED then BLOCKED before provider call.",
    },
    call: async () => {
      throw new Error(
        "This call should never run because modelVersion is missing.",
      );
    },
  });

  const timeout = await callModelThroughGateway({
    traceId,
    kind: syntheticPrompt.kind,
    provider: "synthetic",
    model: "synthetic-model",
    modelVersion: "synthetic-v1",
    promptVersion: syntheticPrompt.promptVersion,
    schemaVersion: syntheticPrompt.schemaVersion,
    timeoutMs: 10,
    inputJson: {
      caseId: "timeout",
      expected: "Gateway should log STARTED then RETRYABLE.",
    },
    call: async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));

      return {
        parsedOutputJson: {
          decision: "OK",
        },
        metadata: {
          syntheticCase: "timeout",
        },
      };
    },
  });

  const provider500 = await callModelThroughGateway({
    traceId,
    kind: syntheticPrompt.kind,
    provider: "synthetic",
    model: "synthetic-model",
    modelVersion: "synthetic-v1",
    promptVersion: syntheticPrompt.promptVersion,
    schemaVersion: syntheticPrompt.schemaVersion,
    inputJson: {
      caseId: "provider-500",
      expected: "Gateway should log STARTED then RETRYABLE.",
    },
    call: async () => {
      throw new Error("Provider returned 500 internal server error.");
    },
  });

  const costLimitExceeded = await callModelThroughGateway({
    traceId,
    kind: syntheticPrompt.kind,
    provider: "synthetic",
    model: "synthetic-model",
    modelVersion: "synthetic-v1",
    promptVersion: syntheticPrompt.promptVersion,
    schemaVersion: syntheticPrompt.schemaVersion,
    costLimitUsd: 0.01,
    inputJson: {
      caseId: "cost-limit-exceeded",
      expected: "Gateway should log STARTED then BLOCKED after cost estimate.",
    },
    call: async () => ({
      parsedOutputJson: {
        decision: "OK",
      },
      outputJson: {
        text: JSON.stringify({ decision: "OK" }),
      },
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      totalTokens: 2_000_000,
      metadata: {
        syntheticCase: "cost-limit-exceeded",
      },
    }),
  });

  const results = [
    {
      caseId: "success",
      result: success,
    },
    {
      caseId: "invalid-json",
      result: invalidJson,
    },
    {
      caseId: "missing-model-version",
      result: missingModelVersion,
    },
    {
      caseId: "timeout",
      result: timeout,
    },
    {
      caseId: "provider-500",
      result: provider500,
    },
    {
      caseId: "cost-limit-exceeded",
      result: costLimitExceeded,
    },
  ];

  const logs = await prisma.aiCallLog.findMany({
    where: {
      traceId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const logRows = logs.map((log) => {
    const inputJson = log.inputJson;

    const caseId =
      typeof inputJson === "object" &&
      inputJson !== null &&
      !Array.isArray(inputJson) &&
      "caseId" in inputJson
        ? String(inputJson.caseId)
        : "unknown";

    return {
      caseId,
      logId: log.id,
      kind: log.kind,
      status: log.status,
      errorType: log.errorType ?? "-",
      retryable: log.retryable,
      latencyMs: log.latencyMs ?? "-",
      inputTokens: log.inputTokens ?? "-",
      outputTokens: log.outputTokens ?? "-",
      totalTokens: log.totalTokens ?? "-",
      estimatedCostUsd: log.estimatedCostUsd ?? "-",
      modelVersion: log.modelVersion ?? "-",
      promptVersion: log.promptVersion ?? "-",
      schemaVersion: log.schemaVersion ?? "-",
    };
  });

  console.log("\nWeek 6 Day 2 Gateway Wrapper Smoke Test");
  console.log("=======================================");
  console.log(`Trace ID: ${traceId}`);
  console.log(`Expected cases: ${expectedCases.length}`);
  console.log(`Gateway logs written: ${logs.length}`);

  console.log("\nReturned gateway results:");
  console.table(
    results.map(({ caseId, result }) => ({
      caseId,
      ok: result.ok,
      status: result.status,
      errorType: result.errorType ?? "-",
      retryable: result.retryable,
      latencyMs: result.latencyMs,
      estimatedCostUsd: result.estimatedCostUsd,
      aiCallLogId: result.aiCallLogId,
    })),
  );

  console.log("\nPersisted ai_call_logs rows:");
  console.table(logRows);

  for (const expectedCase of expectedCases) {
    const matchingLog = logRows.find(
      (row) => row.caseId === expectedCase.caseId,
    );

    if (!matchingLog) {
      throw new Error(
        `Expected ai_call_logs row for case ${expectedCase.caseId}, but none was found.`,
      );
    }

    if (matchingLog.status !== expectedCase.expectedStatus) {
      throw new Error(
        `Case ${expectedCase.caseId} expected status ${expectedCase.expectedStatus}, got ${matchingLog.status}.`,
      );
    }

    if (
      expectedCase.expectedErrorType !== undefined &&
      matchingLog.errorType !== (expectedCase.expectedErrorType ?? "-")
    ) {
      throw new Error(
        `Case ${expectedCase.caseId} expected errorType ${
          expectedCase.expectedErrorType ?? "-"
        }, got ${matchingLog.errorType}.`,
      );
    }
  }

  if (logs.length !== expectedCases.length) {
    throw new Error(
      `Expected ${expectedCases.length} gateway logs, but found ${logs.length}.`,
    );
  }

  console.log("\nGateway wrapper smoke test passed.");
  console.log(
    "Verified SUCCEEDED, FAILED, RETRYABLE, and BLOCKED gateway log states.",
  );
}

main()
  .catch((error) => {
    console.error("\nGateway wrapper smoke test failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
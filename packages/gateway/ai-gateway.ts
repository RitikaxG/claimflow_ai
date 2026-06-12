import { Prisma, prisma } from "@repo/db";
import type { CreateAiCallLogInput } from "./types";

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function optionalJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === undefined || value === null) {
    return Prisma.JsonNull;
  }

  return toPrismaJson(value);
}

export async function createAiCallLog(input: CreateAiCallLogInput) {
  return prisma.aiCallLog.create({
    data: {
      traceId: input.traceId,
      runId: input.runId ?? null,

      kind: input.kind,
      status: input.status,

      provider: input.provider,
      model: input.model,
      modelVersion: input.modelVersion ?? null,
      promptVersion: input.promptVersion ?? null,
      schemaVersion: input.schemaVersion ?? null,

      inputJson: optionalJson(input.inputJson),
      outputJson: optionalJson(input.outputJson),
      parsedOutputJson: optionalJson(input.parsedOutputJson),

      errorType: input.errorType ?? null,
      errorMessage: input.errorMessage ?? null,
      retryable: input.retryable ?? false,

      latencyMs: input.latencyMs ?? null,
      inputTokens: input.inputTokens ?? null,
      outputTokens: input.outputTokens ?? null,
      totalTokens: input.totalTokens ?? null,
      estimatedCostUsd: input.estimatedCostUsd ?? null,

      metadata: optionalJson(input.metadata),
    },
  });
}
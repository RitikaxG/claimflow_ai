import { randomUUID } from "node:crypto";
import { Prisma, prisma } from "@repo/db";
import type { AiCallStatus, AiGatewayFailureType } from "@repo/db";
import type {
  CallModelThroughGatewayInput,
  CreateAiCallLogInput,
  GatewayCallResult,
} from "./types";
import {
  classifyGatewayError,
  getErrorMessage,
  isRetryableGatewayFailure,
} from "./errors";
import { estimateCostUsd, exceedsCostLimit } from "./cost-policy";
import { isLatencySpike } from "./latency-policy";

const DEFAULT_TIMEOUT_MS = 30_000;

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function optionalJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}


function nowMs() {
  return Date.now();
}

function normalizeTokenCount(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getGatewayRates() {
  return {
    inputTokenCostPer1M: Number(process.env.GATEWAY_INPUT_TOKEN_COST_PER_1M ?? 0),
    outputTokenCostPer1M: Number(
      process.env.GATEWAY_OUTPUT_TOKEN_COST_PER_1M ?? 0,
    ),
  };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`Model call timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function buildFailureResult<TParsedOutput>(input: {
  traceId: string;
  aiCallLogId?: string;
  status: "FAILED" | "RETRYABLE" | "BLOCKED";
  errorType: AiGatewayFailureType;
  errorMessage: string;
  retryable: boolean;
  latencyMs: number;
  estimatedCostUsd?: number;
}): GatewayCallResult<TParsedOutput> {
  return {
    ok: false,
    traceId: input.traceId,
    aiCallLogId: input.aiCallLogId,
    status: input.status,
    errorType: input.errorType,
    errorMessage: input.errorMessage,
    retryable: input.retryable,
    latencyMs: input.latencyMs,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: input.estimatedCostUsd ?? 0,
  };
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

      ...(input.inputJson !== undefined && input.inputJson !== null
        ? { inputJson: optionalJson(input.inputJson) }
        : {}),

      ...(input.outputJson !== undefined && input.outputJson !== null
        ? { outputJson: optionalJson(input.outputJson) }
        : {}),

      ...(input.parsedOutputJson !== undefined && input.parsedOutputJson !== null
        ? { parsedOutputJson: optionalJson(input.parsedOutputJson) }
        : {}),

      errorType: input.errorType ?? null,
      errorMessage: input.errorMessage ?? null,
      retryable: input.retryable ?? false,

      latencyMs: input.latencyMs ?? null,
      inputTokens: input.inputTokens ?? null,
      outputTokens: input.outputTokens ?? null,
      totalTokens: input.totalTokens ?? null,
      estimatedCostUsd: input.estimatedCostUsd ?? null,

      ...(input.metadata !== undefined && input.metadata !== null
        ? { metadata: optionalJson(input.metadata) }
        : {}),
    },
  });
}

async function updateAiCallLog(
  id: string,
  data: Partial<CreateAiCallLogInput>,
) {
  return prisma.aiCallLog.update({
    where: {
      id,
    },
    data: {
      ...(data.status !== undefined ? { status: data.status } : {}),

      ...(data.outputJson !== undefined && data.outputJson !== null
        ? { outputJson: optionalJson(data.outputJson) }
        : {}),

      ...(data.parsedOutputJson !== undefined && data.parsedOutputJson !== null
        ? { parsedOutputJson: optionalJson(data.parsedOutputJson) }
        : {}),

      ...(data.errorType !== undefined ? { errorType: data.errorType } : {}),
      ...(data.errorMessage !== undefined
        ? { errorMessage: data.errorMessage }
        : {}),

      ...(data.retryable !== undefined ? { retryable: data.retryable } : {}),

      ...(data.latencyMs !== undefined ? { latencyMs: data.latencyMs } : {}),
      ...(data.inputTokens !== undefined
        ? { inputTokens: data.inputTokens }
        : {}),
      ...(data.outputTokens !== undefined
        ? { outputTokens: data.outputTokens }
        : {}),
      ...(data.totalTokens !== undefined
        ? { totalTokens: data.totalTokens }
        : {}),
      ...(data.estimatedCostUsd !== undefined
        ? { estimatedCostUsd: data.estimatedCostUsd }
        : {}),

      ...(data.metadata !== undefined && data.metadata !== null
        ? { metadata: optionalJson(data.metadata) }
        : {}),
    },
  });
}

function getFinalStatusForError(
  errorType: AiGatewayFailureType,
): Exclude<AiCallStatus, "STARTED" | "SUCCEEDED"> {
  if (isRetryableGatewayFailure(errorType)) {
    return "RETRYABLE";
  }

  return "FAILED";
}

function getTraceId(traceId?: string | null) {
  const trimmed = traceId?.trim();

  if (trimmed && trimmed.length > 0) {
    return trimmed;
  }

  return `trace_${randomUUID()}`;
}

function buildGatewayMetadata(input: {
  timeoutMs: number;
  latencyLimitMs?: number | null;
  costLimitUsd?: number | null;
  extra?: unknown;
}) {
  return {
    gatewayVersion: "week6_day2_v1",
    timeoutMs: input.timeoutMs,
    latencyLimitMs: input.latencyLimitMs ?? null,
    costLimitUsd: input.costLimitUsd ?? null,
    extra: input.extra ?? null,
  };
}

export async function callModelThroughGateway<TParsedOutput = unknown>(
  input: CallModelThroughGatewayInput<TParsedOutput>,
): Promise<GatewayCallResult<TParsedOutput>> {
  const traceId = getTraceId(input.traceId);
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const startedAt = nowMs();

  const startedLog = await createAiCallLog({
    traceId,
    runId: input.runId ?? null,

    kind: input.kind,
    status: "STARTED",

    provider: input.provider,
    model: input.model,
    modelVersion: input.modelVersion ?? null,
    promptVersion: input.promptVersion ?? null,
    schemaVersion: input.schemaVersion ?? null,

    inputJson: input.inputJson,

    retryable: false,
    metadata: buildGatewayMetadata({
      timeoutMs,
      latencyLimitMs: input.latencyLimitMs,
      costLimitUsd: input.costLimitUsd,
    }),
  });

  if (input.requireModelVersion !== false && !input.modelVersion) {
    const latencyMs = nowMs() - startedAt;
    const errorMessage = "modelVersion is required for gateway-governed calls.";

    await updateAiCallLog(startedLog.id, {
      status: "BLOCKED",
      errorType: "MISSING_MODEL_VERSION",
      errorMessage,
      retryable: false,
      latencyMs,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      metadata: buildGatewayMetadata({
        timeoutMs,
        latencyLimitMs: input.latencyLimitMs,
        costLimitUsd: input.costLimitUsd,
        extra: {
          blockedBy: "model_version_policy",
        },
      }),
    });

    return buildFailureResult<TParsedOutput>({
      traceId,
      aiCallLogId: startedLog.id,
      status: "BLOCKED",
      errorType: "MISSING_MODEL_VERSION",
      errorMessage,
      retryable: false,
      latencyMs,
      estimatedCostUsd: 0,
    });
  }

  try {
    const callOutput = await withTimeout(input.call(), timeoutMs);

    let parsedOutputJson = callOutput.parsedOutputJson;

    if (
      parsedOutputJson === undefined &&
      input.expectedJson &&
      typeof callOutput.responseText === "string"
    ) {
      const parsedRawJson = JSON.parse(callOutput.responseText);
      parsedOutputJson = input.expectedJson.parse(parsedRawJson);
    }

    if (parsedOutputJson === undefined && input.expectedJson) {
      throw new Error(
        "Expected JSON schema was provided, but the model call did not return responseText or parsedOutputJson.",
      );
    }

    const latencyMs = nowMs() - startedAt;

    const inputTokens = normalizeTokenCount(callOutput.inputTokens);
    const outputTokens = normalizeTokenCount(callOutput.outputTokens);
    const totalTokens =
      normalizeTokenCount(callOutput.totalTokens) || inputTokens + outputTokens;

    const rates = getGatewayRates();

    const estimatedCostUsd = estimateCostUsd({
      inputTokens,
      outputTokens,
      inputTokenCostPer1M: rates.inputTokenCostPer1M,
      outputTokenCostPer1M: rates.outputTokenCostPer1M,
    });

    if (
      exceedsCostLimit({
        estimatedCostUsd,
        costLimitUsd: input.costLimitUsd,
      })
    ) {
      const errorMessage = `Estimated model cost ${estimatedCostUsd} exceeded limit ${input.costLimitUsd}.`;

      await updateAiCallLog(startedLog.id, {
        status: "BLOCKED",
        outputJson: callOutput.outputJson,
        parsedOutputJson,
        errorType: "COST_LIMIT_EXCEEDED",
        errorMessage,
        retryable: false,
        latencyMs,
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCostUsd,
        metadata: buildGatewayMetadata({
          timeoutMs,
          latencyLimitMs: input.latencyLimitMs,
          costLimitUsd: input.costLimitUsd,
          extra: {
            blockedBy: "cost_policy",
            callMetadata: callOutput.metadata ?? null,
          },
        }),
      });

      return {
        ok: false,
        traceId,
        aiCallLogId: startedLog.id,
        status: "BLOCKED",
        outputJson: callOutput.outputJson,
        parsedOutputJson,
        errorType: "COST_LIMIT_EXCEEDED",
        errorMessage,
        retryable: false,
        latencyMs,
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCostUsd,
      };
    }

    const latencySpike = isLatencySpike({
      latencyMs,
      latencyLimitMs: input.latencyLimitMs,
    });

    await updateAiCallLog(startedLog.id, {
      status: "SUCCEEDED",
      outputJson: callOutput.outputJson,
      parsedOutputJson,
      errorType: latencySpike ? "LATENCY_SPIKE" : null,
      errorMessage: latencySpike
        ? `Latency ${latencyMs}ms exceeded limit ${input.latencyLimitMs}ms.`
        : null,
      retryable: false,
      latencyMs,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCostUsd,
      metadata: buildGatewayMetadata({
        timeoutMs,
        latencyLimitMs: input.latencyLimitMs,
        costLimitUsd: input.costLimitUsd,
        extra: {
          latencySpike,
          callMetadata: callOutput.metadata ?? null,
        },
      }),
    });

    return {
      ok: true,
      traceId,
      aiCallLogId: startedLog.id,
      status: "SUCCEEDED",
      outputJson: callOutput.outputJson,
      parsedOutputJson,
      retryable: false,
      latencyMs,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCostUsd,
    };
  } catch (error) {
    const latencyMs = nowMs() - startedAt;
    const errorType = classifyGatewayError(error);
    const errorMessage = getErrorMessage(error);
    const retryable = isRetryableGatewayFailure(errorType);
    const status = getFinalStatusForError(errorType);

    await updateAiCallLog(startedLog.id, {
      status,
      errorType,
      errorMessage,
      retryable,
      latencyMs,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      metadata: buildGatewayMetadata({
        timeoutMs,
        latencyLimitMs: input.latencyLimitMs,
        costLimitUsd: input.costLimitUsd,
        extra: {
          failureClassifiedBy: "gateway_error_classifier",
        },
      }),
    });

    return buildFailureResult<TParsedOutput>({
      traceId,
      aiCallLogId: startedLog.id,
      status,
      errorType,
      errorMessage,
      retryable,
      latencyMs,
      estimatedCostUsd: 0,
    });
  }
}
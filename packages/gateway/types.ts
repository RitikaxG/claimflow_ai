import type {
  AiCallKind,
  AiCallStatus,
  AiGatewayFailureType,
} from "@repo/db";
import type { z } from "zod";

export type GatewayProvider =
  | "google-genai"
  | "langchain-google-genai"
  | "synthetic";

export type GatewayTokenUsage = {
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
};

export type GatewayModelCallOutput<TParsedOutput = unknown> = GatewayTokenUsage & {
  outputJson?: unknown;
  parsedOutputJson?: TParsedOutput;
  responseText?: string | null;
  metadata?: unknown;
};

export type CallModelThroughGatewayInput<TParsedOutput = unknown> = {
  traceId?: string | null;
  runId?: string | null;

  kind: AiCallKind;
  provider: GatewayProvider | string;
  model: string;
  modelVersion?: string | null;
  promptVersion?: string | null;
  schemaVersion?: string | null;

  inputJson?: unknown;
  expectedJson?: z.ZodType<TParsedOutput>;

  timeoutMs?: number;
  latencyLimitMs?: number;
  costLimitUsd?: number;

  requireModelVersion?: boolean;

  call: () => Promise<GatewayModelCallOutput<TParsedOutput>>;
};

export type GatewayCallResult<TParsedOutput = unknown> = {
  ok: boolean;
  traceId: string;
  aiCallLogId?: string;

  status: Exclude<AiCallStatus, "STARTED">;

  outputJson?: unknown;
  parsedOutputJson?: TParsedOutput;

  errorType?: AiGatewayFailureType;
  errorMessage?: string;

  retryable: boolean;
  latencyMs: number;

  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
};
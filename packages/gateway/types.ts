import type {
  AiCallKind,
  AiCallStatus,
  AiGatewayFailureType,
} from "@repo/db";

export type GatewayProvider = "google-genai" | "langchain-google-genai" | "synthetic";

export type CreateAiCallLogInput = {
  traceId: string;
  runId?: string | null;
  kind: AiCallKind;
  status: AiCallStatus;
  provider: string;
  model: string;
  modelVersion?: string | null;
  promptVersion?: string | null;
  schemaVersion?: string | null;
  inputJson?: unknown;
  outputJson?: unknown;
  parsedOutputJson?: unknown;
  errorType?: AiGatewayFailureType | null;
  errorMessage?: string | null;
  retryable?: boolean;
  latencyMs?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  estimatedCostUsd?: number | null;
  metadata?: unknown;
};

export type GatewaySmokeResult = {
  successLogId: string;
  failedLogId: string;
};
import type {
  AiCallKind,
  AiCallStatus,
  AiGatewayFailureType,
} from "@repo/db";

export type GatewayProvider =
  | "google-genai"
  | "langchain-google-genai"
  | "synthetic";

export type GatewayJsonParser<TParsedOutput = unknown> = {
  parse: (value: unknown) => TParsedOutput;
};

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

export type GatewayTokenUsage = {
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
};

export type GatewayModelCallOutput<TParsedOutput = unknown> =
  GatewayTokenUsage & {
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

  /**
   * Keep this parser structural instead of z.ZodType<T>.
   * This avoids Zod v4 internal generic incompatibility between packages.
   */
  expectedJson?: GatewayJsonParser<TParsedOutput>;

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

  status: "SUCCEEDED" | "FAILED" | "RETRYABLE" | "BLOCKED";

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

export type GatewaySmokeResult = {
  successLogId: string;
  failedLogId: string;
};
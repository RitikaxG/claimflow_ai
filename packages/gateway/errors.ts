import type { AiGatewayFailureType } from "@repo/db";

export class GatewayTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Model call timed out after ${timeoutMs}ms`);
    this.name = "GatewayTimeoutError";
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown gateway error.";
}

export function classifyGatewayError(error: unknown): AiGatewayFailureType {
  const message = getErrorMessage(error).toLowerCase();

  if (message.includes("timeout") || message.includes("timed out")) {
    return "MODEL_TIMEOUT";
  }

  if (message.includes("json") || message.includes("parse")) {
    return "INVALID_JSON_RESPONSE";
  }

  if (
    message.includes("provider") ||
    message.includes("500") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("504") ||
    message.includes("service unavailable") ||
    message.includes("internal server error")
  ) {
    return "PROVIDER_ERROR";
  }

  return "UNKNOWN";
}

export function isRetryableGatewayFailure(errorType: AiGatewayFailureType) {
  return errorType === "MODEL_TIMEOUT" || errorType === "PROVIDER_ERROR";
}
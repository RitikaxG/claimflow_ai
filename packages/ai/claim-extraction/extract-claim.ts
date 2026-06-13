import { readFile } from "node:fs/promises";
import { callModelThroughGateway, PROMPT_REGISTRY } from "@repo/gateway";
import { getGeminiClient, GEMINI_MODEL } from "../client/gemini-client";
import {
  CLAIM_EXTRACTION_PROMPT_VERSION,
  CLAIM_EXTRACTION_SYSTEM_PROMPT,
} from "./prompt";
import {
  ClaimExtractionSchema,
  type ClaimExtraction,
} from "@repo/shared/schemas";
import { CLAIM_EXTRACTION_RESPONSE_SCHEMA } from "./response-schema";
import { toRawModelOutput } from "../utils/raw-model-output";
import { extractGeminiUsage } from "../utils/gemini-usage";

export type GatewayRunContext = {
  traceId?: string | null;
  runId?: string | null;
};

export type ClaimExtractionResult = {
  model: string;
  promptVersion: string;
  rawModelOutput: unknown;
  extractedJson: ClaimExtraction;
  confidenceJson: {
    overallConfidence: number;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toClaimExtractionResult(params: {
  rawModelOutput: unknown;
  extractedJson: ClaimExtraction;
}): ClaimExtractionResult {
  return {
    model: GEMINI_MODEL,
    promptVersion: PROMPT_REGISTRY.extraction.promptVersion,
    rawModelOutput: params.rawModelOutput,
    extractedJson: params.extractedJson,
    confidenceJson: {
      overallConfidence: params.extractedJson.overallConfidence,
    },
  };
}

export async function extractClaimFromPdf(
  filePath: string,
  gateway?: GatewayRunContext,
): Promise<ClaimExtractionResult> {
  const ai = getGeminiClient();
  const pdfBuffer = await readFile(filePath);

  const contents = [
    { text: CLAIM_EXTRACTION_SYSTEM_PROMPT },
    {
      inlineData: {
        mimeType: "application/pdf",
        data: pdfBuffer.toString("base64"),
      },
    },
  ];

  const gatewayResult = await callModelThroughGateway<ClaimExtraction>({
    traceId: gateway?.traceId,
    runId: gateway?.runId,
    kind: "EXTRACTION",
    provider: "google-genai",
    model: GEMINI_MODEL,
    modelVersion: GEMINI_MODEL,
    promptVersion: PROMPT_REGISTRY.extraction.promptVersion,
    schemaVersion: "auto_claim_v1",
    inputJson: {
      sourceType: "PDF",
      mimeType: "application/pdf",
      filePath,
      note: "PDF bytes are intentionally not stored in gateway inputJson.",
    },
    expectedJson: ClaimExtractionSchema,
    timeoutMs: 30_000,
    latencyLimitMs: 20_000,
    call: async () => {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: CLAIM_EXTRACTION_RESPONSE_SCHEMA,
        },
      });

      if (!response.text) {
        throw new Error("Gemini returned an empty extraction response");
      }

      const parsedOutputJson = ClaimExtractionSchema.parse(
        JSON.parse(response.text),
      );

      return {
        responseText: response.text,
        outputJson: toRawModelOutput(response),
        parsedOutputJson,
        ...extractGeminiUsage(response),
        metadata: {
          promptVersion: PROMPT_REGISTRY.extraction.promptVersion,
          schemaVersion: "auto_claim_v1",
          responseMimeType: "application/json",
          sourceType: "PDF",
        },
      };
    },
  });

  if (!gatewayResult.ok || !gatewayResult.parsedOutputJson) {
    throw new Error(
      gatewayResult.errorMessage ?? "Gateway extraction call failed.",
    );
  }

  return toClaimExtractionResult({
    rawModelOutput: gatewayResult.outputJson,
    extractedJson: gatewayResult.parsedOutputJson,
  });
}

export async function extractClaimFromEmailText(
  contentText: string,
  gateway?: GatewayRunContext,
): Promise<ClaimExtractionResult> {
  const ai = getGeminiClient();

  const gatewayResult = await callModelThroughGateway<ClaimExtraction>({
    traceId: gateway?.traceId,
    runId: gateway?.runId,
    kind: "EXTRACTION",
    provider: "google-genai",
    model: GEMINI_MODEL,
    modelVersion: GEMINI_MODEL,
    promptVersion: PROMPT_REGISTRY.extraction.promptVersion,
    schemaVersion: "auto_claim_v1",
    inputJson: {
      sourceType: "EMAIL_TEXT",
      contentLength: contentText.length,
      note: "Full email text is intentionally not stored in gateway inputJson.",
    },
    expectedJson: ClaimExtractionSchema,
    timeoutMs: 30_000,
    latencyLimitMs: 20_000,
    call: async () => {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            text: `${CLAIM_EXTRACTION_SYSTEM_PROMPT}

Email Text:
${contentText}`,
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: CLAIM_EXTRACTION_RESPONSE_SCHEMA,
        },
      });

      if (!response.text) {
        throw new Error("Gemini returned an empty extraction response");
      }

      const parsedOutputJson = ClaimExtractionSchema.parse(
        JSON.parse(response.text),
      );

      return {
        responseText: response.text,
        outputJson: toRawModelOutput(response),
        parsedOutputJson,
        ...extractGeminiUsage(response),
        metadata: {
          promptVersion: PROMPT_REGISTRY.extraction.promptVersion,
          schemaVersion: "auto_claim_v1",
          responseMimeType: "application/json",
          sourceType: "EMAIL_TEXT",
        },
      };
    },
  });

  if (!gatewayResult.ok || !gatewayResult.parsedOutputJson) {
    throw new Error(
      gatewayResult.errorMessage ?? "Gateway extraction call failed.",
    );
  }

  return toClaimExtractionResult({
    rawModelOutput: gatewayResult.outputJson,
    extractedJson: gatewayResult.parsedOutputJson,
  });
}
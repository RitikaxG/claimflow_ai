import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const WEEK6_OBSERVABILITY_DATASET_ROOT =
  process.env.WEEK6_OBSERVABILITY_DATASET_ROOT
    ? path.resolve(process.env.WEEK6_OBSERVABILITY_DATASET_ROOT)
    : path.resolve(__dirname, "../../../sample-data/week-06-observability");

export type GatewayCaseManifest = {
  caseId: string;
  category: string;
  title: string;
  purpose: string;
};

export type GatewaySyntheticBehavior =
  | "success"
  | "timeout"
  | "invalid_json"
  | "provider_error"
  | "cost_limit_exceeded"
  | "cost_spike"
  | "latency_spike"
  | "governance_regression"
  | "eval_score_dropped"
  | "missing_model_version"
  | "should_not_call_provider";

export type GatewayCaseExpected = {
  caseId: string;
  expectedStatus: "SUCCEEDED" | "FAILED" | "RETRYABLE" | "BLOCKED";
  expectedFailureType: string | null;
  expectedRetryable: boolean;
  mustStoreTraceId: boolean;
  mustGenerateTraceId: boolean;
  mustStorePromptVersion: boolean;
  mustStoreModelVersion: boolean;
  mustRecordLatency: boolean;
  mustRecordCost: boolean;
  mustAppearInDashboard: boolean;
  dashboardSeverity: "ok" | "warning" | "error";
};

export type GatewayCaseInput = {
  caseId: string;
  gatewayInput: {
    traceId: string | null;
    runId: string | null;
    kind: string;
    provider: string;
    model: string;
    modelVersion: string | null;
    promptVersion: string | null;
    schemaVersion: string | null;
    timeoutMs?: number;
    latencyLimitMs?: number;
    costLimitUsd?: number;
    inputJson?: unknown;
  };
  syntheticCall: {
    behavior: GatewaySyntheticBehavior;
    delayMs?: number;
    parsedOutputJson?: unknown;
    responseText?: string;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    regressionType?: string;
    previousScore?: number;
    currentScore?: number;
    minimumAllowedScore?: number;
  };
};

export type GatewayEvalCase = {
  caseId: string;
  caseRoot: string;
  manifest: GatewayCaseManifest;
  input: GatewayCaseInput;
  expected: GatewayCaseExpected;
};

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf-8")) as T;
}

function assertCaseIdConsistency(input: {
  caseRoot: string;
  manifest: GatewayCaseManifest;
  caseInput: GatewayCaseInput;
  expected: GatewayCaseExpected;
}) {
  const ids = [
    input.manifest.caseId,
    input.caseInput.caseId,
    input.expected.caseId,
  ];

  const uniqueIds = new Set(ids);

  if (uniqueIds.size !== 1) {
    throw new Error(
      `Gateway case ID mismatch in ${input.caseRoot}: manifest=${input.manifest.caseId}, input=${input.caseInput.caseId}, expected=${input.expected.caseId}`,
    );
  }
}

export async function loadGatewayEvalCases(
  datasetRoot = WEEK6_OBSERVABILITY_DATASET_ROOT,
): Promise<GatewayEvalCase[]> {
  const gatewayCasesRoot = path.join(datasetRoot, "gateway-cases");
  const entries = await readdir(gatewayCasesRoot, { withFileTypes: true });

  const cases: GatewayEvalCase[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const caseRoot = path.join(gatewayCasesRoot, entry.name);

    const manifest = await readJson<GatewayCaseManifest>(
      path.join(caseRoot, "manifest.json"),
    );

    const caseInput = await readJson<GatewayCaseInput>(
      path.join(caseRoot, "input.json"),
    );

    const expected = await readJson<GatewayCaseExpected>(
      path.join(caseRoot, "expected.json"),
    );

    assertCaseIdConsistency({
      caseRoot,
      manifest,
      caseInput,
      expected,
    });

    cases.push({
      caseId: manifest.caseId,
      caseRoot,
      manifest,
      input: caseInput,
      expected,
    });
  }

  return cases.sort((a, b) => a.caseId.localeCompare(b.caseId));
}
import path from "node:path";
import { z } from "zod";
import { prisma } from "@repo/db";
import type { AiCallLog } from "@repo/db";
import { callModelThroughGateway } from "@repo/gateway";
import {
  loadGatewayEvalCases,
  WEEK6_OBSERVABILITY_DATASET_ROOT,
  type GatewayCaseExpected,
  type GatewayCaseInput,
  type GatewayEvalCase,
} from "./lib/gateway-case-loader";
import { summarizeWeek6GatewayMetrics } from "./lib/metrics";
import {
  writeWeek6GatewayEvalReport,
  type Week6GatewayCaseReport,
  type Week6GatewayEvalReport,
} from "./lib/eval-result-writer";

const REPORT_SCHEMA_VERSION = 1;

const SyntheticSchema = z.object({
  decision: z.literal("OK"),
});

type CheckResult = {
  name: string;
  passed: boolean;
  expected?: unknown;
  actual?: unknown;
};

type DashboardCompatibleActual = {
  caseId: string;
  status: string | null;
  severity: "ok" | "warning" | "error";
  failureType: string | null;
  retryable: boolean | null;
  latencyMs: number | null;
  estimatedCostUsd: number | null;
  traceId: string | null;
  modelVersion: string | null;
  promptVersion: string | null;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value
    : {};
}

function buildSyntheticCall(input: GatewayCaseInput) {
  const syntheticCall = input.syntheticCall;

  return async () => {
    switch (syntheticCall.behavior) {
      case "success":
        return {
          parsedOutputJson: syntheticCall.parsedOutputJson ?? {
            decision: "OK",
          },
          outputJson: {
            syntheticCaseId: input.caseId,
            decision: "OK",
          },
          inputTokens: syntheticCall.inputTokens ?? 100,
          outputTokens: syntheticCall.outputTokens ?? 20,
          totalTokens: syntheticCall.totalTokens ?? 120,
          metadata: {
            syntheticBehavior: syntheticCall.behavior,
          },
        };

      case "timeout":
        await delay(
          syntheticCall.delayMs ?? (input.gatewayInput.timeoutMs ?? 10) + 50,
        );

        return {
          parsedOutputJson: {
            decision: "OK",
          },
          metadata: {
            syntheticBehavior: syntheticCall.behavior,
          },
        };

      case "invalid_json":
        return {
          responseText: syntheticCall.responseText ?? "{ invalid json",
          outputJson: {
            text: syntheticCall.responseText ?? "{ invalid json",
          },
          metadata: {
            syntheticBehavior: syntheticCall.behavior,
          },
        };

      case "provider_error":
        throw new Error("Provider returned 500 internal server error.");

      case "cost_limit_exceeded":
        return {
          parsedOutputJson: {
            decision: "OK",
          },
          outputJson: {
            syntheticCaseId: input.caseId,
            decision: "OK",
          },
          inputTokens: syntheticCall.inputTokens ?? 1_000_000,
          outputTokens: syntheticCall.outputTokens ?? 1_000_000,
          totalTokens: syntheticCall.totalTokens ?? 2_000_000,
          metadata: {
            syntheticBehavior: syntheticCall.behavior,
          },
        };

      case "latency_spike":
        await delay(
          syntheticCall.delayMs ?? (input.gatewayInput.latencyLimitMs ?? 1) + 25,
        );

        return {
          parsedOutputJson: {
            decision: "OK",
          },
          outputJson: {
            syntheticCaseId: input.caseId,
            decision: "OK",
          },
          inputTokens: syntheticCall.inputTokens ?? 100,
          outputTokens: syntheticCall.outputTokens ?? 20,
          totalTokens: syntheticCall.totalTokens ?? 120,
          metadata: {
            syntheticBehavior: syntheticCall.behavior,
          },
        };

      case "governance_regression":
        throw new Error("prompt_version_regression detected for synthetic case.");

      case "eval_score_dropped":
        throw new Error("eval_score_dropped below minimum allowed score.");

      case "missing_model_version":
        throw new Error("modelVersion is missing for synthetic case.");

      case "should_not_call_provider":
        throw new Error("Provider should not be called.");

      default:
        throw new Error(`Unsupported synthetic behavior: ${syntheticCall.behavior}`);
    }
  };
}

function addCheck(
  checks: CheckResult[],
  name: string,
  passed: boolean,
  expected?: unknown,
  actual?: unknown,
) {
  checks.push({
    name,
    passed,
    expected,
    actual,
  });
}

async function loadAiCallLog(resultLogId?: string): Promise<AiCallLog | null> {
  if (!resultLogId) return null;

  return prisma.aiCallLog.findUnique({
    where: {
      id: resultLogId,
    },
  });
}

function buildDashboardActual(input: {
  caseId: string;
  expected: GatewayCaseExpected;
  log: AiCallLog | null;
}): DashboardCompatibleActual {
  return {
    caseId: input.caseId,
    status: input.log?.status ?? null,
    severity: input.expected.dashboardSeverity,
    failureType: input.log?.errorType ?? null,
    retryable: input.log?.retryable ?? null,
    latencyMs: input.log?.latencyMs ?? null,
    estimatedCostUsd: input.log?.estimatedCostUsd ?? null,
    traceId: input.log?.traceId ?? null,
    modelVersion: input.log?.modelVersion ?? null,
    promptVersion: input.log?.promptVersion ?? null,
  };
}

function assertGatewayCase(input: {
  evalCase: GatewayEvalCase;
  result: Awaited<ReturnType<typeof callModelThroughGateway>>;
  log: AiCallLog | null;
}): {
  actual: DashboardCompatibleActual & Record<string, unknown>;
  checks: CheckResult[];
  passed: boolean;
} {
  const { evalCase, result, log } = input;
  const expected = evalCase.expected;
  const checks: CheckResult[] = [];

  const actual = {
    ...buildDashboardActual({
      caseId: evalCase.caseId,
      expected,
      log,
    }),
    aiCallLogId: result.aiCallLogId ?? null,
    returnedStatus: result.status,
    returnedFailureType: result.errorType ?? null,
    returnedRetryable: result.retryable,
    returnedTraceId: result.traceId,
  };

  addCheck(
    checks,
    "AiCallLog row exists",
    Boolean(log),
    true,
    Boolean(log),
  );

  addCheck(
    checks,
    "status matches expectedStatus",
    result.status === expected.expectedStatus && log?.status === result.status,
    expected.expectedStatus,
    {
      returned: result.status,
      persisted: log?.status ?? null,
    },
  );

  addCheck(
    checks,
    "errorType matches expectedFailureType",
    (result.errorType ?? null) === expected.expectedFailureType &&
      (log?.errorType ?? null) === expected.expectedFailureType,
    expected.expectedFailureType,
    {
      returned: result.errorType ?? null,
      persisted: log?.errorType ?? null,
    },
  );

  addCheck(
    checks,
    "retryable matches expectedRetryable",
    result.retryable === expected.expectedRetryable &&
      log?.retryable === expected.expectedRetryable,
    expected.expectedRetryable,
    {
      returned: result.retryable,
      persisted: log?.retryable ?? null,
    },
  );

  addCheck(
    checks,
    "traceId exists when required",
    !expected.mustStoreTraceId || Boolean(log?.traceId),
    expected.mustStoreTraceId,
    log?.traceId ?? null,
  );

  addCheck(
    checks,
    "traceId is generated when required",
    !expected.mustGenerateTraceId ||
      Boolean(log?.traceId && log.traceId !== evalCase.input.gatewayInput.traceId),
    expected.mustGenerateTraceId,
    log?.traceId ?? null,
  );

  addCheck(
    checks,
    "promptVersion exists when required",
    !expected.mustStorePromptVersion || Boolean(log?.promptVersion),
    expected.mustStorePromptVersion,
    log?.promptVersion ?? null,
  );

  addCheck(
    checks,
    "modelVersion exists when required",
    !expected.mustStoreModelVersion || Boolean(log?.modelVersion),
    expected.mustStoreModelVersion,
    log?.modelVersion ?? null,
  );

  addCheck(
    checks,
    "latencyMs is recorded when required",
    !expected.mustRecordLatency || typeof log?.latencyMs === "number",
    expected.mustRecordLatency,
    log?.latencyMs ?? null,
  );

  addCheck(
    checks,
    "estimatedCostUsd is recorded when required",
    !expected.mustRecordCost || typeof log?.estimatedCostUsd === "number",
    expected.mustRecordCost,
    log?.estimatedCostUsd ?? null,
  );

  const dashboardFields = [
    actual.caseId,
    actual.status,
    actual.severity,
    actual.retryable,
    actual.latencyMs,
    actual.estimatedCostUsd,
    actual.traceId,
    actual.promptVersion,
  ];

  if (expected.mustStoreModelVersion) {
    dashboardFields.push(actual.modelVersion);
  }

  addCheck(
    checks,
    "case is dashboard-compatible",
    !expected.mustAppearInDashboard ||
      dashboardFields.every((value) => value !== null && value !== undefined),
    expected.mustAppearInDashboard,
    actual,
  );

  addCheck(
    checks,
    "AiCallLog status/errorType match returned gateway result",
    log?.status === result.status &&
      (log?.errorType ?? null) === (result.errorType ?? null),
    {
      status: result.status,
      errorType: result.errorType ?? null,
    },
    {
      status: log?.status ?? null,
      errorType: log?.errorType ?? null,
    },
  );

  return {
    actual,
    checks,
    passed: checks.every((check) => check.passed),
  };
}

async function evaluateCase(
  evalCase: GatewayEvalCase,
): Promise<Week6GatewayCaseReport> {
  try {
    const gatewayInput = evalCase.input.gatewayInput;

    const result = await callModelThroughGateway({
      traceId: gatewayInput.traceId,
      runId: gatewayInput.runId,
      kind: gatewayInput.kind as never,
      provider: gatewayInput.provider,
      model: gatewayInput.model,
      modelVersion: gatewayInput.modelVersion,
      promptVersion: gatewayInput.promptVersion,
      schemaVersion: gatewayInput.schemaVersion,
      timeoutMs: gatewayInput.timeoutMs,
      latencyLimitMs: gatewayInput.latencyLimitMs,
      costLimitUsd: gatewayInput.costLimitUsd,
      inputJson: gatewayInput.inputJson,
      expectedJson:
        evalCase.input.syntheticCall.behavior === "invalid_json"
          ? SyntheticSchema
          : undefined,
      call: buildSyntheticCall(evalCase.input),
    });

    const log = await loadAiCallLog(result.aiCallLogId);

    const assertion = assertGatewayCase({
      evalCase,
      result,
      log,
    });

    return {
      caseId: evalCase.caseId,
      category: evalCase.manifest.category,
      title: evalCase.manifest.title,
      passed: assertion.passed,
      expected: evalCase.expected as unknown as Record<string, unknown>,
      actual: assertion.actual,
      checks: assertion.checks,
      error: null,
    };
  } catch (error) {
    return {
      caseId: evalCase.caseId,
      category: evalCase.manifest.category,
      title: evalCase.manifest.title,
      passed: false,
      expected: evalCase.expected as unknown as Record<string, unknown>,
      actual: {},
      checks: [],
      error: getErrorMessage(error),
    };
  }
}

async function main() {
  process.env.GATEWAY_INPUT_TOKEN_COST_PER_1M ??= "10";
  process.env.GATEWAY_OUTPUT_TOKEN_COST_PER_1M ??= "10";

  const datasetRoot = WEEK6_OBSERVABILITY_DATASET_ROOT;
  const reportRoot = path.join(datasetRoot, "eval-results");

  const cases = await loadGatewayEvalCases(datasetRoot);
  const results: Week6GatewayCaseReport[] = [];

  for (const evalCase of cases) {
    console.log(`Evaluating ${evalCase.caseId}`);
    const result = await evaluateCase(evalCase);
    results.push(result);
    console.log(`${result.passed ? "PASS" : "FAIL"} ${result.caseId}`);
  }

  const passed = results.filter((result) => result.passed).length;
  const failed = results.length - passed;

  const metrics = summarizeWeek6GatewayMetrics(
    results.map((result) => ({
      passed: result.passed,
      actual: {
        status:
          typeof result.actual.status === "string"
            ? result.actual.status
            : null,
        failureType:
          typeof result.actual.failureType === "string"
            ? result.actual.failureType
            : null,
        retryable:
          typeof result.actual.retryable === "boolean"
            ? result.actual.retryable
            : null,
        latencyMs:
          typeof result.actual.latencyMs === "number"
            ? result.actual.latencyMs
            : null,
        estimatedCostUsd:
          typeof result.actual.estimatedCostUsd === "number"
            ? result.actual.estimatedCostUsd
            : null,
        traceId:
          typeof result.actual.traceId === "string"
            ? result.actual.traceId
            : null,
        modelVersion:
          typeof result.actual.modelVersion === "string"
            ? result.actual.modelVersion
            : null,
      },
    })),
  );

  const report: Week6GatewayEvalReport = {
    schemaVersion: REPORT_SCHEMA_VERSION,
    suite: "WEEK6_GATEWAY_OBSERVABILITY",
    generatedAt: new Date().toISOString(),
    datasetRoot,
    summary: {
      totalCases: results.length,
      passed,
      failed,
      warningCases: results.filter(
        (result) => toRecord(result.actual).severity === "warning",
      ).length,
      passRate: results.length === 0 ? null : passed / results.length,
      metrics,
    },
    cases: results,
  };

  const written = await writeWeek6GatewayEvalReport({
    reportRoot,
    report,
  });

  console.log("");
  console.log("Week 6 Gateway Observability Eval");
  console.log(`Cases: ${report.summary.totalCases}`);
  console.log(`Passed: ${report.summary.passed}`);
  console.log(`Failed: ${report.summary.failed}`);
  console.log(
    `Pass rate: ${
      report.summary.passRate === null
        ? "skipped"
        : `${(report.summary.passRate * 100).toFixed(0)}%`
    }`,
  );
  console.log("");
  console.log(`JSON report: ${written.jsonPath}`);
  console.log(`Markdown report: ${written.markdownPath}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  main()
    .catch((error) => {
      console.error("Week 6 gateway observability eval failed.");
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
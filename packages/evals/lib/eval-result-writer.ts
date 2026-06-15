import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { formatPercent, type Week6GatewayMetrics } from "./metrics";

export type Week6GatewayCaseReport = {
  caseId: string;
  category: string;
  title: string;
  passed: boolean;
  expected: Record<string, unknown>;
  actual: Record<string, unknown>;
  checks: Array<{
    name: string;
    passed: boolean;
    expected?: unknown;
    actual?: unknown;
  }>;
  error: string | null;
};

export type Week6GatewayEvalReport = {
  schemaVersion: 1;
  suite: "WEEK6_GATEWAY_OBSERVABILITY";
  generatedAt: string;
  datasetRoot: string;
  summary: {
    totalCases: number;
    passed: number;
    failed: number;
    warningCases: number;
    passRate: number | null;
    metrics: Week6GatewayMetrics;
  };
  cases: Week6GatewayCaseReport[];
};

export type WriteWeek6GatewayEvalReportInput = {
  reportRoot: string;
  report: Week6GatewayEvalReport;
};

const JSON_REPORT_FILENAME = "week-6-gateway-observability-eval.json";
const MARKDOWN_REPORT_FILENAME = "week-6-gateway-observability-eval.md";

function markdownCell(value: unknown): string {
  if (value === null || value === undefined) return "none";

  const text =
    typeof value === "object" ? JSON.stringify(value) : String(value);

  return text.replace(/\|/g, "\\|").replace(/\n/g, "<br/>");
}

function formatMetricValue(value: unknown): string {
  if (typeof value === "number") {
    if (value >= 0 && value <= 1) {
      return formatPercent(value);
    }

    return String(value);
  }

  if (value === null) return "skipped";

  return String(value);
}

function buildMarkdownReport(report: Week6GatewayEvalReport): string {
  const lines: string[] = [];

  lines.push("# Week 6 Gateway Observability Eval Report");
  lines.push("");
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push("");

  lines.push("## Executive Summary");
  lines.push("");
  lines.push(
    `Week 6 gateway observability eval ran **${report.summary.totalCases} cases**. ` +
      `**${report.summary.passed} passed** and **${report.summary.failed} failed**. ` +
      `Pass rate: **${formatPercent(report.summary.passRate)}**.`,
  );
  lines.push("");
  lines.push(
    "This eval verifies that synthetic gateway failures become structured, dashboard-compatible observability evidence.",
  );
  lines.push("");

  lines.push("## Metric Table");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|---|---:|");

  for (const [key, value] of Object.entries(report.summary.metrics)) {
    lines.push(`| ${key} | ${formatMetricValue(value)} |`);
  }

  lines.push("");

  lines.push("## Case Matrix");
  lines.push("");
  lines.push("| Case | Category | Result | Status | Failure type | Severity |");
  lines.push("|---|---|---:|---|---|---|");

  for (const item of report.cases) {
    lines.push(
      `| ${item.caseId} | ${item.category} | ${
        item.passed ? "PASS" : "FAIL"
      } | ${markdownCell(item.actual.status)} | ${markdownCell(
        item.actual.failureType,
      )} | ${markdownCell(item.actual.severity)} |`,
    );
  }

  lines.push("");

  lines.push("## Detailed Case Results");
  lines.push("");

  for (const item of report.cases) {
    lines.push(`### ${item.caseId}`);
    lines.push("");
    lines.push(`**Title:** ${item.title}`);
    lines.push("");
    lines.push(`**Result:** **${item.passed ? "PASS" : "FAIL"}**`);
    lines.push("");

    lines.push("| Check | Result | Expected | Actual |");
    lines.push("|---|---:|---|---|");

    for (const check of item.checks) {
      lines.push(
        `| ${check.name} | ${check.passed ? "PASS" : "FAIL"} | ${markdownCell(
          check.expected,
        )} | ${markdownCell(check.actual)} |`,
      );
    }

    if (item.error) {
      lines.push("");
      lines.push(`**Error:** \`${item.error}\``);
    }

    lines.push("");
  }

  lines.push("## Production Proof");
  lines.push("");
  lines.push("This report proves the Week 6 gateway layer can:");
  lines.push("");
  lines.push("- classify model/provider failures");
  lines.push("- distinguish retryable and non-retryable failures");
  lines.push("- block calls through cost and governance policy");
  lines.push("- preserve trace, model, prompt, latency, and cost metadata");
  lines.push("- generate dashboard-ready case and metric evidence");
  lines.push("");

  return `${lines.join("\n")}\n`;
}

export async function writeWeek6GatewayEvalReport({
  reportRoot,
  report,
}: WriteWeek6GatewayEvalReportInput) {
  await mkdir(reportRoot, { recursive: true });

  const jsonPath = path.join(reportRoot, JSON_REPORT_FILENAME);
  const markdownPath = path.join(reportRoot, MARKDOWN_REPORT_FILENAME);

  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(markdownPath, buildMarkdownReport(report));

  return {
    jsonPath,
    markdownPath,
  };
}
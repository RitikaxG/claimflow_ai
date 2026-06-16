"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { EvalMetricsPanel } from "./eval-metrics-panel";
import { EvalCaseTable } from "./eval-case-table";
import { EvalExplanationPanel } from "./eval-explanation-panel";

type EvalRunResponse = {
  evalRun: {
    id: string;
    suite: string;
    label: string | null;
    totalCases: number;
    passedCases: number;
    failedCases: number;
    warningCases: number;
    passRate: number;
    metricsJson: unknown;
    metadataJson: unknown;
    createdAt: string;
    cases: Array<{
      id: string;
      caseId: string;
      status: string;
      score: number | null;
      failureReason: string | null;
      metadataJson: unknown;
    }>;
  };
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function EvalRunDetailScreen() {
  const params = useParams<{ evalRunId: string }>();
  const [data, setData] = useState<EvalRunResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.evalRunId) return;

    axios
      .get<EvalRunResponse>(`/api/evals/${params.evalRunId}`)
      .then((res) => setData(res.data))
      .catch(() => setError("Failed to load eval run."));
  }, [params.evalRunId]);

  if (error) {
    return <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  }

  if (!data) {
    return <p className="text-sm text-gray-500">Loading eval run...</p>;
  }

  const run = data.evalRun;

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <Link href="/evals" className="text-sm font-medium text-gray-700 underline underline-offset-4">
          Back to eval dashboard
        </Link>

        <div>
          <p className="text-sm font-medium text-gray-500">{run.suite}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-950">
            {run.label ?? "Eval run"}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {formatDate(run.createdAt)} · {(run.passRate * 100).toFixed(1)}% pass rate
          </p>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total</p>
          <p className="mt-1 text-2xl font-semibold text-gray-950">{run.totalCases}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Passed</p>
          <p className="mt-1 text-2xl font-semibold text-green-700">{run.passedCases}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Warnings</p>
          <p className="mt-1 text-2xl font-semibold text-amber-700">{run.warningCases}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Failed</p>
          <p className="mt-1 text-2xl font-semibold text-red-700">{run.failedCases}</p>
        </div>
      </section>

      <EvalExplanationPanel suite={run.suite} />
      <EvalMetricsPanel metrics={run.metricsJson} />
      <EvalCaseTable cases={run.cases} />
    </div>
  );
}
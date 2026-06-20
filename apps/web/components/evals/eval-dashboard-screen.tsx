"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { EvalSuiteCard } from "./eval-suite-card";

type EvalSuiteResponse = {
  suites: Array<{
    suite: string;
    title: string;
    description: string;
    latestRun: {
      id: string;
      passRate: number;
      passedCases: number;
      failedCases: number;
      warningCases: number;
      totalCases: number;
      createdAt: string;
      metricsJson: unknown;
    } | null;
  }>;
};

export function EvalDashboardScreen() {
  const [data, setData] = useState<EvalSuiteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get<EvalSuiteResponse>("/api/evals/latest")
      .then((res) => setData(res.data))
      .catch(() => setError("Failed to load eval dashboard."));
  }, []);

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div>
          <p className="text-sm font-medium text-[var(--cf-muted)]">Eval dashboard</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--cf-navy)]">
            ClaimFlow AI evals
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--cf-muted)]">
            Quality evidence across extraction, review routing, policy RAG, agent actions, memory, and gateway observability.
          </p>
        </div>

        <nav className="flex gap-3 text-sm">
          <Link href="/dashboard" className="rounded-lg border border-[var(--cf-border)] bg-white px-4 py-2 font-medium text-[var(--cf-slate)] shadow-sm">
            Claims
          </Link>
          <Link href="/review" className="rounded-lg border border-[var(--cf-border)] bg-white px-4 py-2 font-medium text-[var(--cf-slate)] shadow-sm">
            Review
          </Link>
        </nav>
      </header>

      {error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {!data && !error ? <p className="text-sm text-[var(--cf-muted)]">Loading evals...</p> : null}

      {data ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {data.suites.map((suite) => (
            <EvalSuiteCard
              key={suite.suite}
              title={suite.title}
              description={suite.description}
              latestRun={suite.latestRun}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

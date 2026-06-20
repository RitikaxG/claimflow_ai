"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useDashboardStore } from "../../store/use-dashboard-store";
import { WorkflowTracePanel } from "./workflow-trace-panel";

export function RunTraceDetailScreen() {
  const params = useParams<{ runId: string }>();
  const runId = params.runId;

  const selectedRun = useDashboardStore((state) => state.selectedRun);
  const isFetchingRun = useDashboardStore((state) => state.isFetchingRun);
  const fetchRun = useDashboardStore((state) => state.fetchRun);

  useEffect(() => {
    if (runId) {
      void fetchRun(runId);
    }
  }, [fetchRun, runId]);

  const claimName = selectedRun?.document.filename ?? runId;

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <Link
          href={`/runs/${runId}`}
          className="text-sm font-semibold text-[var(--cf-blue)] hover:underline"
        >
          ← Back to run
        </Link>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--cf-muted)]">
            Workflow trace
          </p>

          <h1 className="mt-2 max-w-4xl break-words text-2xl font-semibold text-[var(--cf-navy)]">
            {isFetchingRun ? "Loading claim..." : claimName}
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--cf-muted)]">
            End-to-end visibility for this claim: gateway calls, prompt and model versions, latency, cost, agent decisions, guardrails, memory influence, review events, and follow-up state.
          </p>
        </div>
      </header>

      <WorkflowTracePanel runId={runId} />
    </div>
  );
}

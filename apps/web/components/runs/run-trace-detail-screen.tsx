"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { WorkflowTracePanel } from "./workflow-trace-panel";

export function RunTraceDetailScreen() {
  const params = useParams<{ runId: string }>();
  const runId = params.runId;

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <Link
          href={`/runs/${runId}`}
          className="text-sm font-medium text-gray-600 underline underline-offset-4 hover:text-gray-950"
        >
          ← Back to run
        </Link>

        <div>
          <p className="text-sm font-medium text-gray-500">
            Week 6 · Run-level trace
          </p>

          <h1 className="mt-1 text-2xl font-semibold text-gray-950">
            Workflow trace dashboard
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            End-to-end visibility for one claim run: gateway calls, prompt and
            model versions, latency, cost, agent decisions, guardrails, memory
            influence, review events, and follow-up state.
          </p>
        </div>
      </header>

      <WorkflowTracePanel runId={runId} />
    </div>
  );
}
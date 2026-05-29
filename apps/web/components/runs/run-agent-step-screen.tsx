"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useDashboardStore } from "../../store/use-dashboard-store";
import { AgentActionLogCard } from "./agent-action-log-card";
import { FollowupDraftPanel } from "./followup-draft-panel";
import { RunTimeline } from "./run-timeline";

export function RunAgentStepScreen() {
  const params = useParams<{ runId: string }>();

  const selectedRun = useDashboardStore((state) => state.selectedRun);
  const isFetchingRun = useDashboardStore((state) => state.isFetchingRun);
  const isRunningAgentStep = useDashboardStore(
    (state) => state.isRunningAgentStep,
  );
  const error = useDashboardStore((state) => state.error);
  const successMessage = useDashboardStore((state) => state.successMessage);
  const fetchRun = useDashboardStore((state) => state.fetchRun);
  const runAgentStep = useDashboardStore((state) => state.runAgentStep);

  useEffect(() => {
    if (params.runId) {
      void fetchRun(params.runId);
    }
  }, [params.runId, fetchRun]);

  if (isFetchingRun) {
    return <p className="text-sm text-gray-500">Loading agent step page...</p>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!selectedRun) {
    return <p className="text-sm text-gray-500">Run not found.</p>;
  }

  const latestDraft = selectedRun.followupDrafts?.[0] ?? null;
  const agentActionLogs = selectedRun.agentActionLogs ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            href={`/runs/${selectedRun.id}`}
            className="text-sm font-medium text-gray-500 hover:text-gray-900"
          >
            ← Back to run detail
          </Link>

          <h1 className="mt-3 text-2xl font-semibold text-gray-950">
            Agent Step
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Run one guarded workflow step for this claim. This page shows the
            proposed action, guardrail result, draft output, and audit logs for
            this run only. If an information request is drafted, continue from
            the linked review task.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void runAgentStep(selectedRun.id)}
          disabled={isRunningAgentStep}
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRunningAgentStep ? "Running..." : "Run Agent Step"}
        </button>
      </div>

      {successMessage ? (
        <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">
          {successMessage}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Extraction status
          </p>

          <p className="mt-2 text-sm font-semibold text-gray-900">
            {selectedRun.status}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Review status
          </p>

          <p className="mt-2 text-sm font-semibold text-gray-900">
            {selectedRun.reviewTask?.status ?? "No review task"}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Latest agent status
          </p>

          <p className="mt-2 text-sm font-semibold text-gray-900">
            {agentActionLogs[0]?.status ?? "No action yet"}
          </p>
        </div>
      </section>

      <FollowupDraftPanel
        draft={latestDraft}
        reviewTaskId={selectedRun.reviewTask?.id ?? null}
        reviewTaskStatus={selectedRun.reviewTask?.status ?? null}
      />

      <AgentActionLogCard logs={agentActionLogs} />

      <RunTimeline
        events={selectedRun.events}
        title="Recent Agent Timeline"
        maxItems={8}
      />
    </div>
  );
}
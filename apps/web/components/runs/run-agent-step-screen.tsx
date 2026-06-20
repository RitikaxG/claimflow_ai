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
    return <p className="text-sm text-[var(--cf-muted)]">Loading agent page...</p>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!selectedRun) {
    return <p className="text-sm text-[var(--cf-muted)]">Run not found.</p>;
  }

  const latestDraft = selectedRun.followupDrafts?.[0] ?? null;
  const agentActionLogs = selectedRun.agentActionLogs ?? [];
  const latestAgentAction = agentActionLogs[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            href={`/runs/${selectedRun.id}`}
            className="text-sm font-semibold text-[var(--cf-blue)] hover:underline"
          >
            ← Back to run
          </Link>

          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--cf-muted)]">
            Agent workflow
          </p>
          <h1 className="mt-2 max-w-4xl break-words text-2xl font-semibold text-[var(--cf-navy)]">
            {selectedRun.document.filename}
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--cf-muted)]">
            Run one guarded workflow step for this claim and inspect the proposed action, guardrail result, draft output, and audit logs.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void runAgentStep(selectedRun.id)}
          disabled={isRunningAgentStep}
          className="rounded-xl bg-[var(--cf-navy)] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRunningAgentStep ? "Running..." : "Run agent step"}
        </button>
      </div>

      {successMessage ? (
        <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">
          {successMessage}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[var(--cf-border)] bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--cf-muted)]">
            Run status
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--cf-navy)]">
            {selectedRun.status}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--cf-border)] bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--cf-muted)]">
            Review status
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--cf-navy)]">
            {selectedRun.reviewTask?.status ?? "No review task"}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--cf-border)] bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--cf-muted)]">
            Latest agent status
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--cf-navy)]">
            {agentActionLogs[0]?.status ?? "No action yet"}
          </p>
        </div>
      </section>

      {latestAgentAction ? (
        <section className="rounded-2xl border border-[var(--cf-border)] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-[var(--cf-navy)]">
              Latest agent action
            </h2>
            <span className="rounded-full bg-[var(--cf-panel-muted)] px-3 py-1 text-xs font-medium text-[var(--cf-slate)]">
              {latestAgentAction.action}
            </span>
            <span className="rounded-full bg-[var(--cf-panel-muted)] px-3 py-1 text-xs font-medium text-[var(--cf-slate)]">
              {latestAgentAction.status}
            </span>
            {latestAgentAction.guardrailDecision ? (
              <span className="rounded-full bg-[var(--cf-panel-muted)] px-3 py-1 text-xs font-medium text-[var(--cf-slate)]">
                Guardrail: {latestAgentAction.guardrailDecision}
              </span>
            ) : null}
          </div>

          {latestAgentAction.rationale ? (
            <p className="mt-3 text-sm text-[var(--cf-muted)]">
              {latestAgentAction.rationale}
            </p>
          ) : null}

          {latestAgentAction.toolName ? (
            <p className="mt-2 text-sm text-[var(--cf-muted)]">
              Tool: <span className="font-mono text-[var(--cf-navy)]">{latestAgentAction.toolName}</span>
            </p>
          ) : null}
        </section>
      ) : null}

      <FollowupDraftPanel
        draft={latestDraft}
        reviewTaskId={selectedRun.reviewTask?.id ?? null}
        reviewTaskStatus={selectedRun.reviewTask?.status ?? null}
        events={selectedRun.events}
      />

      <AgentActionLogCard logs={agentActionLogs} />

      <RunTimeline
        events={selectedRun.events}
        title="Recent agent timeline"
        maxItems={8}
      />
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useDashboardStore } from "../../store/use-dashboard-store";
import { MemoryCard } from "./memory-card";

export function RunMemoryDetailScreen() {
  const params = useParams<{ runId: string }>();
  const runId = params.runId;

  const audit = useDashboardStore((state) => state.runMemoriesByRunId[runId]);
  const selectedRun = useDashboardStore((state) => state.selectedRun);
  const isFetchingRun = useDashboardStore((state) => state.isFetchingRun);
  const isFetchingRunMemories = useDashboardStore(
    (state) => state.isFetchingRunMemories,
  );
  const isRetrievingRunMemories = useDashboardStore(
    (state) => state.isRetrievingRunMemories,
  );

  const fetchRun = useDashboardStore((state) => state.fetchRun);
  const fetchRunMemories = useDashboardStore((state) => state.fetchRunMemories);
  const retrieveRunMemories = useDashboardStore(
    (state) => state.retrieveRunMemories,
  );

  useEffect(() => {
    if (runId) {
      void fetchRun(runId);
      void fetchRunMemories(runId);
    }
  }, [fetchRun, fetchRunMemories, runId]);

  const memories = audit?.memories ?? [];
  const memoryAlreadyRetrieved = memories.length > 0;
  const claimName = selectedRun?.document.filename ?? runId;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/runs/${runId}`}
            className="text-sm font-semibold text-[var(--cf-blue)] hover:underline"
          >
            ← Back to run
          </Link>

          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--cf-muted)]">
            Memory audit
          </p>
          <h1 className="mt-2 max-w-4xl break-words text-2xl font-semibold text-[var(--cf-navy)]">
            {isFetchingRun ? "Loading claim..." : claimName}
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--cf-muted)]">
            Review memory hits, match reasons, safe-use constraints, agent usage, and update history for this claim.
          </p>
        </div>

        <button
          type="button"
          disabled={isRetrievingRunMemories || memoryAlreadyRetrieved}
          onClick={() => void retrieveRunMemories(runId)}
          className="rounded-lg bg-[var(--cf-navy)] px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {isRetrievingRunMemories
            ? "Retrieving..."
            : memoryAlreadyRetrieved
              ? "Memory already retrieved"
              : "Retrieve memory"}
        </button>
      </div>

      <section className="rounded-2xl border border-[var(--cf-border)] bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-[var(--cf-border)] bg-[var(--cf-panel-muted)] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--cf-muted)]">
              Run status
            </p>
            <p className="mt-1 text-lg font-semibold text-[var(--cf-navy)]">
              {isFetchingRun ? "Loading..." : selectedRun?.status ?? "Unknown"}
            </p>
          </div>

          <div className="rounded-xl border border-[var(--cf-border)] bg-[var(--cf-panel-muted)] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--cf-muted)]">
              Retrieved memories
            </p>
            <p className="mt-1 text-lg font-semibold text-[var(--cf-navy)]">
              {audit?.summary.totalHits ?? 0}
            </p>
          </div>

          <div className="rounded-xl border border-[var(--cf-border)] bg-[var(--cf-panel-muted)] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--cf-muted)]">
              High risk
            </p>
            <p className="mt-1 text-lg font-semibold text-[var(--cf-navy)]">
              {audit?.summary.highRiskCount ?? 0}
            </p>
          </div>

          <div className="rounded-xl border border-[var(--cf-border)] bg-[var(--cf-panel-muted)] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--cf-muted)]">
              Used by agent
            </p>
            <p className="mt-1 text-lg font-semibold text-[var(--cf-navy)]">
              {audit?.summary.usedByAgentCount ?? 0}
            </p>
          </div>
        </div>

        <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
          Memory is not claim evidence. It can guide review routing and verification, but it must not overwrite extracted JSON, policy citations, or human decisions.
        </p>
      </section>

      {isFetchingRunMemories ? (
        <p className="text-sm text-[var(--cf-muted)]">Loading memory audit...</p>
      ) : null}

      {!isFetchingRunMemories && memories.length === 0 ? (
        <section className="rounded-2xl border border-[var(--cf-border)] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[var(--cf-navy)]">
            No memory hits found for this run.
          </p>
          <p className="mt-1 text-sm text-[var(--cf-muted)]">
            Retrieve memory from the run page or from this page after validation.
          </p>
        </section>
      ) : null}

      {memories.length > 0 ? (
        <section className="space-y-4">
          {memories.map((memory) => (
            <MemoryCard key={memory.memoryHitId} memory={memory} />
          ))}
        </section>
      ) : null}
    </div>
  );
}

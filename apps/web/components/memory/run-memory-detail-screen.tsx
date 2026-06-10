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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/runs/${runId}`}
            className="text-sm font-medium text-gray-600 hover:text-gray-950"
          >
            ← Back to run
          </Link>

          <h1 className="mt-3 text-2xl font-semibold text-gray-950">
            Workflow memory audit
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            Full trace of memory hits, match reasons, safe-use constraints,
            must-not-do rules, agent usage, and update history for this run.
          </p>
        </div>

        <button
          type="button"
          disabled={isRetrievingRunMemories || memoryAlreadyRetrieved}
          onClick={() => void retrieveRunMemories(runId)}
          className="rounded-lg bg-gray-950 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {isRetrievingRunMemories
            ? "Retrieving..."
            : memoryAlreadyRetrieved
              ? "Memory already retrieved"
              : "Retrieve memory"}
        </button>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Run status
            </p>
            <p className="mt-1 text-lg font-semibold text-gray-950">
              {isFetchingRun ? "Loading..." : selectedRun?.status ?? "Unknown"}
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Retrieved Memories
            </p>
            <p className="mt-1 text-lg font-semibold text-gray-950">
              {audit?.summary.totalHits ?? 0}
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              High risk
            </p>
            <p className="mt-1 text-lg font-semibold text-gray-950">
              {audit?.summary.highRiskCount ?? 0}
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Used by agent
            </p>
            <p className="mt-1 text-lg font-semibold text-gray-950">
              {audit?.summary.usedByAgentCount ?? 0}
            </p>
          </div>
        </div>

        <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
          Memory is not claim evidence. It can guide review routing and
          verification, but it must not overwrite extracted JSON, policy
          citations, or human decisions.
        </p>
      </section>

      {isFetchingRunMemories ? (
        <p className="text-sm text-gray-500">Loading memory audit...</p>
      ) : null}

      {!isFetchingRunMemories && memories.length === 0 ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-950">
            No memory hits found for this run.
          </p>
          <p className="mt-1 text-sm text-gray-600">
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
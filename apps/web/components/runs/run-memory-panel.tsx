"use client";

import { useEffect } from "react";
import { useDashboardStore } from "../../store/use-dashboard-store";
import { MemoryCard } from "../memory/memory-card";

type RunMemoryPanelProps = {
  runId: string;
  status: string;
};

function canRetrieveMemory(status: string) {
  return status === "COMPLETED" || status === "NEEDS_REVIEW";
}

export function RunMemoryPanel({ runId, status }: RunMemoryPanelProps) {
  const audit = useDashboardStore((state) => state.runMemoriesByRunId[runId]);
  const isFetchingRunMemories = useDashboardStore(
    (state) => state.isFetchingRunMemories,
  );
  const isRetrievingRunMemories = useDashboardStore(
    (state) => state.isRetrievingRunMemories,
  );
  const fetchRunMemories = useDashboardStore((state) => state.fetchRunMemories);
  const retrieveRunMemories = useDashboardStore(
    (state) => state.retrieveRunMemories,
  );

  useEffect(() => {
    void fetchRunMemories(runId);
  }, [fetchRunMemories, runId]);

  const memories = audit?.memories ?? [];
  const retrievalAllowed = canRetrieveMemory(status);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">
            Week 5 · Workflow memory
          </p>

          <h2 className="mt-1 text-lg font-semibold text-gray-950">
            Relevant memory
          </h2>

          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            Memory is shown for auditability. It can route a claim to human
            review, but it must not overwrite extraction, validation, or policy
            evidence.
          </p>
        </div>

        <button
          type="button"
          disabled={!retrievalAllowed || isRetrievingRunMemories}
          onClick={() => void retrieveRunMemories(runId)}
          className="rounded-lg bg-gray-950 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {isRetrievingRunMemories
            ? "Retrieving..."
            : "Retrieve workflow memory"}
        </button>
      </div>

      {!retrievalAllowed ? (
        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
          Run validation first. Memory retrieval is enabled only after the run is
          completed or needs review.
        </div>
      ) : null}

      {isFetchingRunMemories ? (
        <p className="mt-4 text-sm text-gray-500">Loading memory audit...</p>
      ) : null}

      {audit ? (
        <div className="mt-4 grid gap-3 text-sm text-gray-700 md:grid-cols-3">
          <p>
            Total hits:{" "}
            <span className="font-semibold text-gray-950">
              {audit.summary.totalHits}
            </span>
          </p>

          <p>
            Used by agent:{" "}
            <span className="font-semibold text-gray-950">
              {audit.summary.usedByAgentCount}
            </span>
          </p>

          <p>
            High risk:{" "}
            <span className="font-semibold text-gray-950">
              {audit.summary.highRiskCount}
            </span>
          </p>
        </div>
      ) : null}

      {!isFetchingRunMemories && memories.length === 0 ? (
        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
          No workflow memory has been retrieved for this run yet.
        </div>
      ) : null}

      {memories.length > 0 ? (
        <div className="mt-5 space-y-4">
          {memories.map((memory) => (
            <MemoryCard key={memory.memoryHitId} memory={memory} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
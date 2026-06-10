"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  useDashboardStore,
  type RunMemoryAuditItemRecord,
} from "../../store/use-dashboard-store";

type ReviewMemoryPanelProps = {
  runId: string;
  taskStatus: string;
};

function riskRank(riskLevel: string) {
  if (riskLevel === "HIGH") return 3;
  if (riskLevel === "MEDIUM") return 2;
  return 1;
}

function getReviewMemories(memories: RunMemoryAuditItemRecord[]) {
  const usedByAgent = memories.filter((memory) => memory.usedByAgent);

  const source = usedByAgent.length > 0 ? usedByAgent : memories;

  return [...source]
    .sort((left, right) => {
      const riskDiff = riskRank(right.riskLevel) - riskRank(left.riskLevel);

      if (riskDiff !== 0) {
        return riskDiff;
      }

      return right.score - left.score;
    })
    .slice(0, 3);
}

export function ReviewMemoryPanel({
  runId,
  taskStatus,
}: ReviewMemoryPanelProps) {
  const audit = useDashboardStore((state) => state.runMemoriesByRunId[runId]);
  const isFetchingRunMemories = useDashboardStore(
    (state) => state.isFetchingRunMemories,
  );
  const memoryFeedbackInFlightId = useDashboardStore(
    (state) => state.memoryFeedbackInFlightId,
  );

  const fetchRunMemories = useDashboardStore((state) => state.fetchRunMemories);
  const submitMemoryFeedback = useDashboardStore(
    (state) => state.submitMemoryFeedback,
  );

  useEffect(() => {
    void fetchRunMemories(runId);
  }, [fetchRunMemories, runId]);

  const memories = audit?.memories ?? [];
  const reviewMemories = getReviewMemories(memories);
  const canSubmitFeedback = taskStatus === "IN_REVIEW";

  const handleFeedback = (
    memory: RunMemoryAuditItemRecord,
    relevance: "CONFIRMED_RELEVANT" | "IRRELEVANT",
  ) => {
    void submitMemoryFeedback(runId, {
      memoryId: memory.memoryId,
      memoryHitId: memory.memoryHitId,
      relevance,
    });
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">
            Week 5 · Memory-assisted review
          </p>

          <h2 className="mt-1 text-lg font-semibold text-gray-950">
            Memory guidance for reviewer
          </h2>

          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            These memories may explain why the agent drafted a request or routed
            the claim carefully. Confirm whether the memory was actually useful.
          </p>
        </div>

        <Link
          href={`/runs/${runId}/memory`}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
        >
          Full memory audit
        </Link>
      </div>

      {isFetchingRunMemories ? (
        <p className="mt-4 text-sm text-gray-500">Loading memory guidance...</p>
      ) : null}

      {!isFetchingRunMemories && reviewMemories.length === 0 ? (
        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
          No workflow memory was retrieved or used for this run.
        </div>
      ) : null}

      {reviewMemories.length > 0 ? (
        <div className="mt-5 space-y-3">
          {reviewMemories.map((memory) => (
            <div
              key={memory.memoryId}
              className="rounded-xl border border-gray-200 bg-gray-50 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-700">
                  {memory.kind.replaceAll("_", " ")}
                </span>

                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-700">
                  {memory.riskLevel} risk
                </span>

                {memory.usedByAgent ? (
                  <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700">
                    Used by agent
                  </span>
                ) : (
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-600">
                    Retrieved only
                  </span>
                )}
              </div>

              <p className="mt-3 text-sm font-semibold text-gray-950">
                {memory.summary}
              </p>

              <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">Safe use:</span>{" "}
                  {memory.safeUse}
                </p>
              </div>

              {memory.mustNotDo.length > 0 ? (
                <div className="mt-3 rounded-lg border border-red-100 bg-red-50 p-3">
                  <p className="text-sm font-semibold text-red-900">
                    Must not do
                  </p>

                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-red-800">
                    {memory.mustNotDo.slice(0, 3).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {canSubmitFeedback ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={memoryFeedbackInFlightId === memory.memoryId}
                    onClick={() =>
                      handleFeedback(memory, "CONFIRMED_RELEVANT")
                    }
                    className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    Relevant
                  </button>

                  <button
                    type="button"
                    disabled={memoryFeedbackInFlightId === memory.memoryId}
                    onClick={() => handleFeedback(memory, "IRRELEVANT")}
                    className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    Irrelevant
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-900">
        Memory is not claim evidence. Use it only to decide what a human should
        verify.
      </p>
    </section>
  );
}
"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  useDashboardStore,
  type RunMemoryAuditItemRecord,
} from "../../store/use-dashboard-store";

type RunMemoryPanelProps = {
  runId: string;
  status: string;
};

function canRetrieveMemory(status: string) {
  return status === "COMPLETED" || status === "NEEDS_REVIEW";
}

function riskRank(riskLevel: string) {
  if (riskLevel === "HIGH") {
    return 3;
  }

  if (riskLevel === "MEDIUM") {
    return 2;
  }

  return 1;
}

function getTopMemoryGists(memories: RunMemoryAuditItemRecord[]) {
  return [...memories]
    .sort((left, right) => {
      if (left.usedByAgent !== right.usedByAgent) {
        return left.usedByAgent ? -1 : 1;
      }

      const riskDiff = riskRank(right.riskLevel) - riskRank(left.riskLevel);

      if (riskDiff !== 0) {
        return riskDiff;
      }

      return right.score - left.score;
    })
    .slice(0, 3);
}

function getSuggestedAction(input: {
  hasMemory: boolean;
  hasHighRiskMemory: boolean;
  hasUsedByAgentMemory: boolean;
}) {
  if (!input.hasMemory) {
    return "Retrieve workflow memory after validation, then run the agent step with memory-aware context.";
  }

  if (input.hasHighRiskMemory) {
    return "Open the review task and verify the high-risk memory. Do not approve, reject, or fill fields from memory.";
  }

  if (input.hasUsedByAgentMemory) {
    return "Review the agent action and verify that the draft follows the memory safe-use instructions.";
  }

  return "Run the agent step so the retrieved memory can guide the next workflow action.";
}

function getMemoryToneClasses(memory: RunMemoryAuditItemRecord) {
  if (memory.riskLevel === "HIGH") {
    return {
      card: "border-red-100 bg-red-50",
      label: "bg-red-100 text-red-800",
      text: "text-red-950",
      muted: "text-red-800",
    };
  }

  if (memory.usedByAgent) {
    return {
      card: "border-purple-100 bg-purple-50",
      label: "bg-purple-100 text-purple-800",
      text: "text-purple-950",
      muted: "text-purple-800",
    };
  }

  return {
    card: "border-blue-100 bg-blue-50",
    label: "bg-blue-100 text-blue-800",
    text: "text-blue-950",
    muted: "text-blue-800",
  };
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

  const retrievalAllowed = canRetrieveMemory(status);
  const memories = audit?.memories ?? [];
  const hasMemory = memories.length > 0;

  const highRiskCount = audit?.summary.highRiskCount ?? 0;
  const usedByAgentCount = audit?.summary.usedByAgentCount ?? 0;
  const topMemoryGists = getTopMemoryGists(memories);

  const suggestedAction = getSuggestedAction({
    hasMemory,
    hasHighRiskMemory: highRiskCount > 0,
    hasUsedByAgentMemory: usedByAgentCount > 0,
  });

  const memoryAlreadyRetrieved = hasMemory;
  const retrieveDisabled =
    !retrievalAllowed || isRetrievingRunMemories || memoryAlreadyRetrieved;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">
            Week 5 · Workflow memory
          </p>

          <h2 className="mt-1 text-lg font-semibold text-gray-950">
            Memory guidance
          </h2>

          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            Relevant past workflow memory that can guide the next agent action.
            Memory can suggest caution, specificity, or escalation, but it is
            not claim evidence.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={retrieveDisabled}
            onClick={() => void retrieveRunMemories(runId)}
            className="rounded-lg bg-gray-950 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isRetrievingRunMemories
              ? "Retrieving..."
              : memoryAlreadyRetrieved
                ? "Memory already retrieved"
                : "Retrieve memory"}
          </button>

          <Link
            href={`/runs/${runId}/memory`}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
          >
            Full memory audit
          </Link>
        </div>
      </div>

      {!retrievalAllowed ? (
        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
          Run validation first. Memory retrieval is enabled only after the run is
          completed or needs review.
        </div>
      ) : null}

      {isFetchingRunMemories ? (
        <p className="mt-4 text-sm text-gray-500">Loading memory guidance...</p>
      ) : null}

      {!isFetchingRunMemories && !hasMemory ? (
        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-950">
            No workflow memory has been retrieved yet.
          </p>

          <p className="mt-1 text-sm text-gray-600">{suggestedAction}</p>
        </div>
      ) : null}

      {hasMemory ? (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-gray-700">
              {audit?.summary.totalHits ?? memories.length} retrieved
            </span>

            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-gray-700">
              {usedByAgentCount} used by agent
            </span>

            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-gray-700">
              {highRiskCount} high risk
            </span>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Retrieved memory gist
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  Showing the most relevant memories first. Open the full audit
                  to inspect every hit, match reason, and update trail.
                </p>
              </div>

              <Link
                href={`/runs/${runId}/memory`}
                className="text-sm font-medium text-gray-900 underline underline-offset-4 hover:text-gray-600"
              >
                View all
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {topMemoryGists.map((memory) => {
                const tone = getMemoryToneClasses(memory);

                return (
                  <div
                    key={memory.memoryHitId}
                    className={`rounded-xl border p-4 ${tone.card}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone.label}`}
                      >
                        {memory.kind.replaceAll("_", " ")}
                      </span>

                      <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-gray-700">
                        {memory.riskLevel} risk
                      </span>

                      <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-gray-700">
                        score {memory.score}
                      </span>

                      {memory.usedByAgent ? (
                        <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700">
                          Used by agent
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-gray-600">
                          Retrieved only
                        </span>
                      )}
                    </div>

                    <p className={`mt-3 text-sm font-semibold ${tone.text}`}>
                      {memory.summary}
                    </p>

                    <p className={`mt-2 text-sm ${tone.muted}`}>
                      <span className="font-semibold">Safe use:</span>{" "}
                      {memory.safeUse}
                    </p>

                    {memory.mustNotDo.length > 0 ? (
                      <p className="mt-2 text-sm text-red-700">
                        <span className="font-semibold">Must not:</span>{" "}
                        {memory.mustNotDo.slice(0, 2).join("; ")}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-950">
              Suggested next step
            </p>

            <p className="mt-1 text-sm text-amber-900">{suggestedAction}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
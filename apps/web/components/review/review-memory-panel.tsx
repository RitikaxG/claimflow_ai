"use client";

import { useEffect } from "react";
import {
  useDashboardStore,
  type RunMemoryAuditItemRecord,
} from "../../store/use-dashboard-store";
import { MemoryCard } from "../memory/memory-card";

type ReviewMemoryPanelProps = {
  runId: string;
  taskStatus: string;
};

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
  const canSubmitFeedback = taskStatus === "IN_REVIEW";

  const handleFeedback = (
    memory: RunMemoryAuditItemRecord,
    relevance: "CONFIRMED_RELEVANT" | "IRRELEVANT",
    note: string,
  ) => {
    void submitMemoryFeedback(runId, {
      memoryId: memory.memoryId,
      memoryHitId: memory.memoryHitId,
      relevance,
      note,
    });
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-medium text-gray-500">
          Week 5 · Human memory check
        </p>

        <h2 className="mt-1 text-lg font-semibold text-gray-950">
          Workflow memory used for this review
        </h2>

        <p className="mt-1 max-w-2xl text-sm text-gray-600">
          Reviewers can confirm whether retrieved memory was actually useful.
          This strengthens or weakens memory, but does not decide the claim.
        </p>
      </div>

      {isFetchingRunMemories ? (
        <p className="mt-4 text-sm text-gray-500">Loading memory audit...</p>
      ) : null}

      {!isFetchingRunMemories && memories.length === 0 ? (
        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
          No workflow memory was retrieved or used for this run.
        </div>
      ) : null}

      {!canSubmitFeedback && memories.length > 0 ? (
        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
          Memory feedback is enabled only while the review task is IN_REVIEW.
        </div>
      ) : null}

      {memories.length > 0 ? (
        <div className="mt-5 space-y-4">
          {memories.map((memory) => (
            <MemoryCard
              key={memory.memoryHitId}
              memory={memory}
              showFeedbackActions={canSubmitFeedback}
              isFeedbackBusy={memoryFeedbackInFlightId === memory.memoryId}
              onFeedback={handleFeedback}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
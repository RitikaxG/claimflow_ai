"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useDashboardStore } from "../../store/use-dashboard-store";
import { ReviewTaskStatusBadge } from "./review-task-status-badge";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

type ReviewReasonView = {
  missingFields?: unknown[];
  conflicts?: unknown[];
  warnings?: unknown[];
  requiredEvidence?: unknown[];
};

function getReviewReasonCounts(reasonJson: unknown) {
  const reason =
    typeof reasonJson === "object" && reasonJson !== null
      ? (reasonJson as ReviewReasonView)
      : null;

  return {
    missingFieldsCount: Array.isArray(reason?.missingFields)
      ? reason.missingFields.length
      : 0,
    conflictsCount: Array.isArray(reason?.conflicts)
      ? reason.conflicts.length
      : 0,
    warningsCount: Array.isArray(reason?.warnings) ? reason.warnings.length : 0,
    requiredEvidenceCount: Array.isArray(reason?.requiredEvidence)
      ? reason.requiredEvidence.length
      : 0,
  };
}

export function ReviewQueueList() {
  const reviewTasks = useDashboardStore((state) => state.reviewTasks);
  const isFetchingReviewTasks = useDashboardStore(
    (state) => state.isFetchingReviewTasks,
  );
  const fetchReviewTasks = useDashboardStore((state) => state.fetchReviewTasks);
  const error = useDashboardStore((state) => state.error);

  useEffect(() => {
    void fetchReviewTasks();
  }, [fetchReviewTasks]);

  return (
    <section className="cf-card overflow-hidden rounded-2xl">
      <div className="border-b border-[var(--cf-border)] p-5">
        <h2 className="text-xl font-semibold text-[var(--cf-navy)]">Review tasks</h2>
        <p className="mt-1 text-sm text-[var(--cf-muted)]">
          Tasks created from validation issues, missing fields, conflicts, low confidence, or required evidence.
        </p>
      </div>

      {error ? (
        <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {isFetchingReviewTasks ? (
        <div className="p-5 text-sm text-[var(--cf-muted)]">Loading review queue...</div>
      ) : null}

      {!isFetchingReviewTasks && reviewTasks.length === 0 ? (
        <div className="p-5 text-sm text-[var(--cf-muted)]">
          No review tasks right now. Validate an incomplete claim to create one.
        </div>
      ) : null}

      {reviewTasks.length > 0 ? (
        <div className="divide-y divide-[var(--cf-border)]">
          {reviewTasks.map((task) => {
            const counts = getReviewReasonCounts(task.reasonJson);

            return (
              <article key={task.id} className="p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <ReviewTaskStatusBadge status={task.status} />
                      <span className="rounded-full border border-[var(--cf-border)] bg-[var(--cf-panel-muted)] px-2.5 py-1 text-xs font-medium text-[var(--cf-muted)]">
                        Priority: {task.priority}
                      </span>
                      <span className="text-xs text-[var(--cf-muted)]">{formatDate(task.createdAt)}</span>
                    </div>
                    <h3 className="truncate text-base font-semibold text-[var(--cf-navy)]">
                      {task.run.document.filename}
                    </h3>
                    <div className="flex flex-wrap gap-3 text-xs text-[var(--cf-muted)]">
                      <span>Missing: {counts.missingFieldsCount}</span>
                      <span>Conflicts: {counts.conflictsCount}</span>
                      <span>Warnings: {counts.warningsCount}</span>
                      <span>Evidence: {counts.requiredEvidenceCount}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm font-semibold">
                    <Link href={`/review/${task.id}`} className="rounded-lg bg-[var(--cf-navy)] px-4 py-2 text-white hover:bg-slate-800">
                      Open review
                    </Link>
                    <Link href={`/runs/${task.run.id}`} className="rounded-lg border border-[var(--cf-border-strong)] bg-white px-4 py-2 text-[var(--cf-navy)] hover:border-[var(--cf-navy)]">
                      Open run
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

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
          Human review tasks created when a claim has missing fields, required evidence, conflicts, warnings, or low confidence.
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="cf-table-header text-xs uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3 font-semibold">Claim</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Priority</th>
                <th className="px-5 py-3 font-semibold">Missing</th>
                <th className="px-5 py-3 font-semibold">Conflicts</th>
                <th className="px-5 py-3 font-semibold">Warnings</th>
                <th className="px-5 py-3 font-semibold">Evidence</th>
                <th className="px-5 py-3 font-semibold">Created</th>
                <th className="px-5 py-3 font-semibold">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--cf-border)] bg-white">
              {reviewTasks.map((task) => {
                const counts = getReviewReasonCounts(task.reasonJson);

                return (
                  <tr key={task.id} className="hover:bg-[var(--cf-panel-muted)]">
                    <td className="max-w-[360px] px-5 py-4">
                      <p className="truncate font-semibold text-[var(--cf-navy)]">{task.run.document.filename}</p>
                      <p className="mt-1 font-mono text-xs text-[var(--cf-muted)]">{task.run.id}</p>
                    </td>
                    <td className="px-5 py-4"><ReviewTaskStatusBadge status={task.status} /></td>
                    <td className="px-5 py-4 text-[var(--cf-slate)]">{task.priority}</td>
                    <td className="px-5 py-4 font-semibold text-[var(--cf-amber)]">{counts.missingFieldsCount}</td>
                    <td className="px-5 py-4 font-semibold text-[var(--cf-red)]">{counts.conflictsCount}</td>
                    <td className="px-5 py-4 font-semibold text-[var(--cf-amber)]">{counts.warningsCount}</td>
                    <td className="px-5 py-4 font-semibold text-[var(--cf-slate)]">{counts.requiredEvidenceCount}</td>
                    <td className="px-5 py-4 text-[var(--cf-muted)]">{formatDate(task.createdAt)}</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center gap-3 font-semibold">
                        <Link href={`/review/${task.id}`} className="text-[var(--cf-blue)] hover:underline">Review</Link>
                        <Link href={`/runs/${task.run.id}`} className="text-[var(--cf-slate)] hover:text-[var(--cf-blue)] hover:underline">Run</Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

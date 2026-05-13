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
  sourceFinalStatus?: string;
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
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-950">
          Review tasks
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          These tasks were created when validation found missing fields, conflicts,
          low confidence, or required evidence.
        </p>
      </div>

      {error ? (
        <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {isFetchingReviewTasks ? (
        <div className="p-5 text-sm text-gray-500">
          Loading review queue...
        </div>
      ) : null}

      {!isFetchingReviewTasks && reviewTasks.length === 0 ? (
        <div className="p-5 text-sm text-gray-500">
          No runs need review right now. Validate an incomplete claim to see it
          appear here.
        </div>
      ) : null}

      {reviewTasks.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3">Document</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Missing</th>
                <th className="px-5 py-3">Conflicts</th>
                <th className="px-5 py-3">Warnings</th>
                <th className="px-5 py-3">Evidence</th>
                <th className="px-5 py-3">Updated</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {reviewTasks.map((task) => {
                const counts = getReviewReasonCounts(task.reasonJson);
                const run = task.run;

                return (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 font-medium text-gray-950">
                      {task.run.document.filename}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {task.run.document.sourceType}
                    </td>

                    <td className="px-5 py-4">
                      <ReviewTaskStatusBadge status={task.status} />
                    </td>

                    <td className="px-5 py-4 font-medium text-orange-700">
                      {counts.missingFieldsCount}
                    </td>

                    <td className="px-5 py-4 font-medium text-red-700">
                      {counts.conflictsCount}
                    </td>

                    <td className="px-5 py-4 font-medium text-yellow-700">
                      {counts.warningsCount}
                    </td>

                    <td className="px-5 py-4 font-medium text-gray-700">
                      {counts.requiredEvidenceCount}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {formatDate(task.updatedAt)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <Link
                        href={`/runs/${run.id}`}
                        className="font-medium text-gray-950 underline underline-offset-4"
                      >
                        Review
                      </Link>
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
"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useDashboardStore } from "../../store/use-dashboard-store";
import { RunStatusBadge } from "./run-status-badge";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function RecentRunsList() {
  const runs = useDashboardStore((state) => state.runs);
  const isFetchingRuns = useDashboardStore((state) => state.isFetchingRuns);
  const error = useDashboardStore((state) => state.error);
  const successMessage = useDashboardStore((state) => state.successMessage);
  const fetchRuns = useDashboardStore((state) => state.fetchRuns);

  useEffect(() => {
    void fetchRuns();
  }, [fetchRuns]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-950">Recent runs</h2>
        <p className="mt-1 text-sm text-gray-600">
          Every uploaded document creates a durable extraction run.
        </p>
      </div>

      {successMessage ? (
        <div className="border-b border-green-100 bg-green-50 px-5 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      ) : null}

      {error ? (
        <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {isFetchingRuns ? (
        <div className="p-5 text-sm text-gray-500">Loading runs...</div>
      ) : null}

      {!isFetchingRuns && runs.length === 0 ? (
        <div className="p-5 text-sm text-gray-500">
          No runs yet. Upload a PDF or paste email text to create one.
        </div>
      ) : null}

      {runs.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3">Document</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-medium text-gray-950">
                    {run.document.filename}
                  </td>
                  <td className="px-5 py-4 text-gray-600">
                    {run.document.sourceType}
                  </td>
                  <td className="px-5 py-4">
                    <RunStatusBadge status={run.status} />
                  </td>
                  <td className="px-5 py-4 text-gray-600">
                    {formatDate(run.createdAt)}
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/runs/${run.id}`}
                      className="font-medium text-gray-950 underline underline-offset-4"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
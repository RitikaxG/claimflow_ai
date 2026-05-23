"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { useDashboardStore } from "../../store/use-dashboard-store";
import { CoverageAssistantCard } from "./coverage-assistant-card";
import { RunHeader } from "./run-header";

export function ClaimCoverageScreen() {
  const params = useParams<{ runId: string }>();

  const selectedRun = useDashboardStore((state) => state.selectedRun);
  const isFetchingRun = useDashboardStore((state) => state.isFetchingRun);
  const error = useDashboardStore((state) => state.error);
  const fetchRun = useDashboardStore((state) => state.fetchRun);

  useEffect(() => {
    if (params.runId) {
      void fetchRun(params.runId);
    }
  }, [params.runId, fetchRun]);

  if (isFetchingRun) {
    return <p className="text-sm text-gray-500">Loading run coverage...</p>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!selectedRun) {
    return <p className="text-sm text-gray-500">Run not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/runs/${selectedRun.id}`}
          className="text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          ← Back to run detail
        </Link>

        <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
          Claim-specific coverage
        </span>
      </div>

      <RunHeader runId={selectedRun.id} status={selectedRun.status} />

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Claim Coverage Decision
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Ask coverage questions for this specific extraction run. The system
          uses the extracted or reviewer-corrected claim context plus retrieved
          policy clauses.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Document
            </p>
            <p className="mt-1 truncate text-sm font-medium text-gray-800">
              {selectedRun.document.filename}
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Source
            </p>
            <p className="mt-1 text-sm font-medium text-gray-800">
              {selectedRun.document.sourceType}
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Schema
            </p>
            <p className="mt-1 text-sm font-medium text-gray-800">
              {selectedRun.schemaVersion}
            </p>
          </div>
        </div>
      </section>

      <CoverageAssistantCard runId={selectedRun.id} status={selectedRun.status} />
    </div>
  );
}
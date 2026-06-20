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
          className="text-sm font-semibold text-[var(--cf-blue)] hover:underline"
        >
          ← Back to run detail
        </Link>

        <span className="rounded-full border border-blue-100 bg-[var(--cf-blue-soft)] px-3 py-1 text-xs font-medium text-[var(--cf-blue)]">
          Claim-specific coverage
        </span>
      </div>

      <RunHeader
        runId={selectedRun.id}
        status={selectedRun.status}
        title={selectedRun.document.filename}
        sourceType={selectedRun.document.sourceType}
      />

      <section className="rounded-2xl border border-[var(--cf-border)] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--cf-navy)]">
          Coverage assessment
        </h2>

        <p className="mt-1 text-sm text-[var(--cf-muted)]">
          Ask coverage questions for this claim. The answer uses the extracted or human-corrected claim context plus retrieved policy clauses.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-[var(--cf-panel-muted)] p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--cf-muted)]">
              Document
            </p>
            <p className="mt-1 truncate text-sm font-medium text-[var(--cf-navy)]">
              {selectedRun.document.filename}
            </p>
          </div>

          <div className="rounded-xl bg-[var(--cf-panel-muted)] p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--cf-muted)]">
              Source
            </p>
            <p className="mt-1 text-sm font-medium text-[var(--cf-navy)]">
              {selectedRun.document.sourceType}
            </p>
          </div>

          <div className="rounded-xl bg-[var(--cf-panel-muted)] p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--cf-muted)]">
              Schema
            </p>
            <p className="mt-1 text-sm font-medium text-[var(--cf-navy)]">
              {selectedRun.schemaVersion}
            </p>
          </div>
        </div>
      </section>

      <CoverageAssistantCard runId={selectedRun.id} status={selectedRun.status} />
    </div>
  );
}

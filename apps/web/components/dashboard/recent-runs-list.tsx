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

function sourceLabel(value: string) {
  if (value.toLowerCase().includes("email")) return "Email";
  if (value.toLowerCase().includes("pdf")) return "PDF";
  return value;
}

export function RecentRunsList() {
  const runs = useDashboardStore((state) => state.runs);
  const isFetchingRuns = useDashboardStore((state) => state.isFetchingRuns);
  const error = useDashboardStore((state) => state.error);
  const successMessage = useDashboardStore((state) => state.successMessage);
  const fetchRuns = useDashboardStore((state) => state.fetchRuns);
  const deleteDocument = useDashboardStore((state) => state.deleteDocument);
  const deletingDocumentId = useDashboardStore(
    (state) => state.deletingDocumentId,
  );

  useEffect(() => {
    void fetchRuns();
  }, [fetchRuns]);

  const handleDeleteDocument = (params: {
    documentId: string;
    filename: string;
  }) => {
    const confirmed = window.confirm(
      `Soft delete "${params.filename}"?\n\nThis will hide it from the dashboard and review queue, but keep the source document, extraction result, validation result, and audit trail for restore later.`,
    );

    if (!confirmed) return;

    void deleteDocument(
      params.documentId,
      "User soft deleted document from dashboard.",
    );
  };

  return (
    <section className="cf-card overflow-hidden rounded-2xl">
      <div className="flex flex-col gap-3 border-b border-[var(--cf-border)] p-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--cf-navy)]">Claims</h2>
          <p className="mt-1 text-sm text-[var(--cf-muted)]">
            Open a claim to continue through review, coverage, memory, agent action, and trace.
          </p>
        </div>
        <Link href="/review" className="text-sm font-semibold text-[var(--cf-blue)] hover:underline">
          View review queue
        </Link>
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
        <div className="p-5 text-sm text-[var(--cf-muted)]">Loading claims...</div>
      ) : null}

      {!isFetchingRuns && runs.length === 0 ? (
        <div className="p-5 text-sm text-[var(--cf-muted)]">
          No claims yet. Upload a PDF or paste a claim email to create the first run.
        </div>
      ) : null}

      {runs.length > 0 ? (
        <div className="divide-y divide-[var(--cf-border)]">
          {runs.map((run) => (
            <article key={run.id} className="p-5 transition hover:bg-white">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <RunStatusBadge status={run.status} />
                    <span className="rounded-full border border-[var(--cf-border)] bg-[var(--cf-panel-muted)] px-2.5 py-1 text-xs font-medium text-[var(--cf-muted)]">
                      {sourceLabel(run.document.sourceType)}
                    </span>
                    <span className="text-xs text-[var(--cf-muted)]">{formatDate(run.createdAt)}</span>
                  </div>
                  <h3 className="truncate text-base font-semibold text-[var(--cf-navy)]">
                    {run.document.filename}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
                  <Link href={`/runs/${run.id}`} className="rounded-lg bg-[var(--cf-navy)] px-4 py-2 text-white hover:bg-slate-800">
                    Open run
                  </Link>
                  <Link href={`/runs/${run.id}/trace`} className="rounded-lg border border-[var(--cf-border-strong)] bg-white px-4 py-2 text-[var(--cf-navy)] hover:border-[var(--cf-navy)]">
                    Trace
                  </Link>
                  <button
                    type="button"
                    disabled={deletingDocumentId === run.document.id}
                    onClick={() =>
                      handleDeleteDocument({
                        documentId: run.document.id,
                        filename: run.document.filename,
                      })
                    }
                    className="text-red-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    {deletingDocumentId === run.document.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

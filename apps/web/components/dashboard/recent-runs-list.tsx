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
  if (value.toLowerCase().includes("email")) return "Claim email";
  if (value.toLowerCase().includes("pdf")) return "PDF evidence";
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

    if (!confirmed) {
      return;
    }

    void deleteDocument(
      params.documentId,
      "User soft deleted document from dashboard.",
    );
  };

  return (
    <section className="cf-card overflow-hidden rounded-[2rem]">
      <div className="flex flex-col gap-4 border-b border-[var(--cf-border)] p-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--cf-blue)]">Claim run ledger</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--cf-navy)]">Recent claim operations</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--cf-muted)]">
            Each run is a reviewable workflow artifact: source intake, extraction state, validation status, and links into the traceable AI loop.
          </p>
        </div>
        <Link href="/review" className="rounded-full border border-[var(--cf-border)] bg-white px-4 py-2 text-sm font-bold text-[var(--cf-navy)] shadow-sm transition hover:border-[var(--cf-blue)] hover:text-[var(--cf-blue)]">
          Open review queue
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
        <div className="p-5 text-sm text-[var(--cf-muted)]">Loading claim runs...</div>
      ) : null}

      {!isFetchingRuns && runs.length === 0 ? (
        <div className="p-6">
          <div className="rounded-3xl border border-dashed border-[var(--cf-border-strong)] bg-[var(--cf-panel-muted)] p-6 text-center">
            <p className="text-base font-semibold text-[var(--cf-navy)]">No claim runs yet.</p>
            <p className="mt-2 text-sm text-[var(--cf-muted)]">
              Upload a PDF or paste a claim email to start the extraction and validation workflow.
            </p>
          </div>
        </div>
      ) : null}

      {runs.length > 0 ? (
        <div className="grid gap-4 p-5 xl:grid-cols-2">
          {runs.map((run) => (
            <article key={run.id} className="rounded-3xl border border-[var(--cf-border)] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--cf-muted)]">
                    {sourceLabel(run.document.sourceType)}
                  </p>
                  <h3 className="mt-2 truncate text-lg font-semibold text-[var(--cf-navy)]">
                    {run.document.filename}
                  </h3>
                </div>
                <RunStatusBadge status={run.status} />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-[var(--cf-panel-muted)] p-3">
                  <p className="text-xs font-semibold text-[var(--cf-muted)]">Created</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--cf-slate)]">{formatDate(run.createdAt)}</p>
                </div>
                <div className="rounded-2xl bg-blue-50 p-3">
                  <p className="text-xs font-semibold text-blue-700">Next step</p>
                  <p className="mt-1 text-xs leading-5 text-blue-900">Open run evidence</p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-3">
                  <p className="text-xs font-semibold text-amber-800">Control</p>
                  <p className="mt-1 text-xs leading-5 text-amber-900">Human reviewable</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm font-bold">
                <Link href={`/runs/${run.id}`} className="rounded-full bg-[var(--cf-navy)] px-4 py-2 text-white transition hover:bg-[var(--cf-navy-soft)]">
                  Open claim run
                </Link>
                <Link href={`/runs/${run.id}/trace`} className="rounded-full border border-[var(--cf-border)] px-4 py-2 text-[var(--cf-slate)] transition hover:border-[var(--cf-blue)] hover:text-[var(--cf-blue)]">
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
                  className="rounded-full border border-red-100 px-4 py-2 text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                >
                  {deletingDocumentId === run.document.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

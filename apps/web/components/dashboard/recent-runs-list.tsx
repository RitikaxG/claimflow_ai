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
            Open a run to continue through extraction, validation, review, coverage, memory, agent action, and trace.
          </p>
        </div>
        <Link href="/review" className="rounded-lg border border-[var(--cf-border-strong)] bg-white px-3 py-2 text-sm font-semibold text-[var(--cf-navy)] hover:border-[var(--cf-blue)] hover:text-[var(--cf-blue)]">
          Review queue
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="cf-table-header text-xs uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3 font-semibold">Claim</th>
                <th className="px-5 py-3 font-semibold">Source</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Created</th>
                <th className="px-5 py-3 font-semibold">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--cf-border)] bg-white">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-[var(--cf-panel-muted)]">
                  <td className="max-w-[420px] px-5 py-4">
                    <p className="truncate font-semibold text-[var(--cf-navy)]">{run.document.filename}</p>
                    <p className="mt-1 font-mono text-xs text-[var(--cf-muted)]">{run.id}</p>
                  </td>
                  <td className="px-5 py-4 text-[var(--cf-slate)]">{sourceLabel(run.document.sourceType)}</td>
                  <td className="px-5 py-4"><RunStatusBadge status={run.status} /></td>
                  <td className="px-5 py-4 text-[var(--cf-muted)]">{formatDate(run.createdAt)}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <div className="flex items-center gap-3 font-semibold">
                      <Link href={`/runs/${run.id}`} className="text-[var(--cf-blue)] hover:underline">Run</Link>
                      <Link href={`/runs/${run.id}/trace`} className="text-[var(--cf-slate)] hover:text-[var(--cf-blue)] hover:underline">Trace</Link>
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

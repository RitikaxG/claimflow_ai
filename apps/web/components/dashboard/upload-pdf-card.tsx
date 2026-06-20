"use client";

import { useState } from "react";
import { useDashboardStore } from "../../store/use-dashboard-store";

export function UploadPdfCard() {
  const [file, setFile] = useState<File | null>(null);

  const uploadPdf = useDashboardStore((state) => state.uploadPdf);
  const isUploadingPdf = useDashboardStore((state) => state.isUploadingPdf);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;

    if (!file) return;

    try {
      await uploadPdf(file);
      setFile(null);
      form.reset();
    } catch (error) {
      console.error("PDF upload failed:", error);
    }
  };

  return (
    <section className="cf-card rounded-[2rem] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--cf-cyan)]">Claim intake</p>
          <h2 className="text-xl font-semibold text-[var(--cf-navy)]">Upload claim PDF</h2>
          <p className="text-sm leading-6 text-[var(--cf-muted)]">
            Use this for claim forms, repair estimates, police reports, or motor evidence packets.
          </p>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-lg">▣</span>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <label className="block rounded-2xl border border-dashed border-[var(--cf-border-strong)] bg-[var(--cf-panel-muted)] p-4 text-sm text-[var(--cf-slate)] transition hover:border-[var(--cf-cyan)]">
          <span className="font-semibold">Select a PDF evidence file</span>
          <input
            type="file"
            accept="application/pdf"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
            }}
            className="mt-3 block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-[var(--cf-navy)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
        </label>

        {file ? (
          <p className="rounded-2xl bg-blue-50 px-4 py-3 text-xs text-[var(--cf-slate)]">
            Selected: <span className="font-semibold text-[var(--cf-navy)]">{file.name}</span>
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!file || isUploadingPdf}
          className="cf-focus-ring w-full rounded-2xl bg-[var(--cf-blue)] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-900/15 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
        >
          {isUploadingPdf ? "Creating claim run..." : "Create run from PDF"}
        </button>
      </form>
    </section>
  );
}

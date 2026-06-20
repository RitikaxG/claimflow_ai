"use client";

import { useState } from "react";
import { useDashboardStore } from "../../store/use-dashboard-store";

export function EmailTextCard() {
  const [contentText, setContentText] = useState("");

  const submitEmailText = useDashboardStore((state) => state.submitEmailText);
  const isSubmittingEmail = useDashboardStore((state) => state.isSubmittingEmail);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (contentText.trim().length < 20) return;

    await submitEmailText(contentText);
    setContentText("");
  };

  return (
    <section className="cf-card rounded-[2rem] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--cf-amber)]">Fast demo path</p>
          <h2 className="text-xl font-semibold text-[var(--cf-navy)]">Paste claim email</h2>
          <p className="text-sm leading-6 text-[var(--cf-muted)]">
            Useful for portfolio demos where you want to create a motor claim run without uploading a file.
          </p>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-50 text-lg">✉</span>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <textarea
          value={contentText}
          onChange={(event) => setContentText(event.target.value)}
          placeholder="Paste a claimant email, accident summary, missing evidence note, or motor claim form text..."
          rows={8}
          className="cf-focus-ring w-full resize-none rounded-2xl border border-[var(--cf-border)] bg-[var(--cf-panel-muted)] px-4 py-3 text-sm leading-6 text-[var(--cf-text)] placeholder:text-slate-400 focus:border-[var(--cf-blue)]"
        />

        <button
          type="submit"
          disabled={contentText.trim().length < 20 || isSubmittingEmail}
          className="cf-focus-ring w-full rounded-2xl bg-[var(--cf-navy)] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition hover:bg-[var(--cf-navy-soft)] disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
        >
          {isSubmittingEmail ? "Creating claim run..." : "Create run from email text"}
        </button>
      </form>
    </section>
  );
}

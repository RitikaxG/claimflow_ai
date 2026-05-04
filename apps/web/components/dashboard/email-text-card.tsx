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
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-gray-950">Paste email text</h2>
        <p className="text-sm text-gray-600">
          Useful for testing the intake workflow without uploading a file.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <textarea
          value={contentText}
          onChange={(event) => setContentText(event.target.value)}
          placeholder="Paste claim email or claim form text..."
          rows={7}
          className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 placeholder:text-gray-400 caret-gray-950 outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
        />

        <button
          type="submit"
          disabled={contentText.trim().length < 20 || isSubmittingEmail}
          className="w-full rounded-lg bg-gray-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {isSubmittingEmail ? "Submitting..." : "Create run from email text"}
        </button>
      </form>
    </section>
  );
}
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
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-gray-950">Upload PDF</h2>
        <p className="text-sm text-gray-600">
          Use this for claim forms, repair estimates, or police reports.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <input
          type="file"
          accept="application/pdf"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
          }}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />

        {file ? (
          <p className="text-xs text-gray-500">
            Selected: <span className="font-medium">{file.name}</span>
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!file || isUploadingPdf}
          className="w-full rounded-lg bg-gray-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {isUploadingPdf ? "Uploading..." : "Create run from PDF"}
        </button>
      </form>
    </section>
  );
}
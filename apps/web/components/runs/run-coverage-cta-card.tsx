"use client";

import Link from "next/link";

type RunCoverageCtaCardProps = {
  runId: string;
  status: string;
};

function canAskCoverage(status: string) {
  return status === "COMPLETED" || status === "NEEDS_REVIEW";
}

export function RunCoverageCtaCard({ runId, status }: RunCoverageCtaCardProps) {
  const isAvailable = canAskCoverage(status);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">
              Claim Coverage Assessment
            </h2>

            <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
              Week 3 RAG
            </span>
          </div>

          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Ask whether this extracted claim appears covered under the policy.
            The answer will cite retrieved policy clauses and show retrieval
            evidence on a dedicated page.
          </p>

          {!isAvailable ? (
            <p className="mt-3 text-sm text-yellow-700">
              Coverage assessment is available after extraction + validation.
              Current status: <span className="font-semibold">{status}</span>
            </p>
          ) : null}
        </div>

        {isAvailable ? (
          <Link
            href={`/runs/${runId}/coverage`}
            className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            Open coverage page
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex cursor-not-allowed items-center justify-center rounded-xl bg-gray-300 px-4 py-2 text-sm font-medium text-white"
          >
            Coverage unavailable
          </button>
        )}
      </div>
    </section>
  );
}
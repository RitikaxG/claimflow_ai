"use client";

import type { ExtractionRunRecord } from "../../store/use-dashboard-store";
import { useDashboardStore } from "../../store/use-dashboard-store";
import { RunStatusBadge } from "../dashboard/run-status-badge";

type RunStatusCardProps = {
  run: ExtractionRunRecord;
};

export function RunStatusCard({ run }: RunStatusCardProps) {
  const extractRun = useDashboardStore((state) => state.extractRun);
  const isExtractingRun = useDashboardStore((state) => state.isExtractingRun);

  const validateRun = useDashboardStore((state) => state.validateRun);
  const isValidatingRun = useDashboardStore((state) => state.isValidatingRun);

  const canRunExtraction =
    run.status === "UPLOADED" || run.status === "FAILED";

  const canRunValidation = run.status === "VALIDATING";

  const extractionButtonLabel =
    run.status === "FAILED" ? "Retry extraction" : "Run extraction";

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-950">Run status</h2>

      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-gray-500">Current status</dt>
          <dd className="mt-1">
            <RunStatusBadge status={run.status} />
          </dd>
        </div>

        <div>
          <dt className="text-gray-500">Schema version</dt>
          <dd className="mt-1 font-medium text-gray-950">
            {run.schemaVersion}
          </dd>
        </div>

        <div>
          <dt className="text-gray-500">Model</dt>
          <dd className="mt-1 font-medium text-gray-950">
            {run.model ?? "Not started"}
          </dd>
        </div>

        <div>
          <dt className="text-gray-500">Prompt version</dt>
          <dd className="mt-1 font-medium text-gray-950">
            {run.promptVersion ?? "Not started"}
          </dd>
        </div>
      </dl>

      {run.errorMessage ? (
        <div className="mt-5 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          {run.errorMessage}
        </div>
      ) : null}

      {run.status === "FAILED" ? (
        <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
          This run failed. You can retry extraction after fixing the input or
          after a transient model/API issue.
        </div>
      ) : null}

      {canRunExtraction ? (
        <button
          type="button"
          disabled={isExtractingRun}
          onClick={() => void extractRun(run.id)}
          className="mt-5 w-full rounded-lg bg-gray-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {isExtractingRun ? "Extracting..." : extractionButtonLabel}
        </button>
      ) : null}

      {canRunValidation ? (
        <button
          type="button"
          disabled={isValidatingRun}
          onClick={() => void validateRun(run.id)}
          className="mt-5 w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {isValidatingRun ? "Validating..." : "Run validation"}
        </button>
      ) : null}
    </section>
  );
}
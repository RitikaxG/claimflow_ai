import type { ExtractionRunRecord } from "../../store/use-dashboard-store";
import { RunStatusBadge } from "../dashboard/run-status-badge";

type RunStatusCardProps = {
  run: ExtractionRunRecord;
};

export function RunStatusCard({ run }: RunStatusCardProps) {
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
    </section>
  );
}
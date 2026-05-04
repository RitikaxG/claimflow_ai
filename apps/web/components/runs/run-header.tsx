import Link from "next/link";
import type { RunStatus } from "../../store/use-dashboard-store";
import { RunStatusBadge } from "../dashboard/run-status-badge";

type RunHeaderProps = {
  runId: string;
  status: RunStatus;
};

export function RunHeader({ runId, status }: RunHeaderProps) {
  return (
    <header className="space-y-4">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-gray-600 underline underline-offset-4"
      >
        ← Back to dashboard
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">Extraction Run</p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-950">
            {runId}
          </h1>
        </div>

        <RunStatusBadge status={status} />
      </div>
    </header>
  );
}
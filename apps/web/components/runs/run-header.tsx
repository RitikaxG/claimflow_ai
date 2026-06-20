import Link from "next/link";
import type { RunStatus } from "../../store/use-dashboard-store";
import { RunStatusBadge } from "../dashboard/run-status-badge";

type RunHeaderProps = {
  runId: string;
  status: RunStatus;
  title?: string | null;
  sourceType?: string | null;
};

export function RunHeader({ runId, status, title, sourceType }: RunHeaderProps) {
  const label = sourceType ? sourceType.replaceAll("_", " ") : "Claim run";
  const heading = title?.trim() ? title : "Claim run";

  return (
    <header className="space-y-4">
      <Link
        href="/dashboard"
        className="text-sm font-semibold text-[var(--cf-blue)] hover:underline"
      >
        ← Back to claims
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--cf-muted)]">
            {label}
          </p>
          <h1 className="mt-2 break-words text-2xl font-semibold text-[var(--cf-navy)] md:text-3xl">
            {heading}
          </h1>
          <p className="mt-2 font-mono text-xs text-[var(--cf-muted)]">
            Run ID: {runId}
          </p>
        </div>

        <RunStatusBadge status={status} />
      </div>
    </header>
  );
}

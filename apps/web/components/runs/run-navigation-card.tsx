import Link from "next/link";

type RunNavigationCardProps = {
  runId: string;
  reviewTaskId?: string | null;
};

export function RunNavigationCard({ runId, reviewTaskId }: RunNavigationCardProps) {
  return (
    <section className="rounded-2xl border border-[var(--cf-border)] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--cf-navy)]">Run navigation</h2>
          <p className="mt-1 text-sm text-[var(--cf-muted)]">Use these links to continue this claim.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm font-semibold">
          {reviewTaskId ? (
            <Link href={`/review/${reviewTaskId}`} className="rounded-lg bg-[var(--cf-navy)] px-4 py-2 text-white hover:bg-slate-800">
              Open review
            </Link>
          ) : null}
          <Link href={`/runs/${runId}/coverage`} className="rounded-lg border border-[var(--cf-border-strong)] bg-white px-4 py-2 text-[var(--cf-navy)] hover:border-[var(--cf-navy)]">Coverage</Link>
          <Link href={`/runs/${runId}/memory`} className="rounded-lg border border-[var(--cf-border-strong)] bg-white px-4 py-2 text-[var(--cf-navy)] hover:border-[var(--cf-navy)]">Memory</Link>
          <Link href={`/runs/${runId}/agent-step`} className="rounded-lg border border-[var(--cf-border-strong)] bg-white px-4 py-2 text-[var(--cf-navy)] hover:border-[var(--cf-navy)]">Agent</Link>
          <Link href={`/runs/${runId}/trace`} className="rounded-lg border border-[var(--cf-border-strong)] bg-white px-4 py-2 text-[var(--cf-navy)] hover:border-[var(--cf-navy)]">Trace</Link>
        </div>
      </div>
    </section>
  );
}

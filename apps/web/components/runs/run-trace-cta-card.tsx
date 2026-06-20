import Link from "next/link";
import type {
  ReviewTaskStatus,
  RunStatus,
} from "../../store/use-dashboard-store";

type RunTraceCtaCardProps = {
  runId: string;
  status: RunStatus;
  reviewTaskStatus: ReviewTaskStatus | null;
};

export function RunTraceCtaCard({
  runId,
  status,
  reviewTaskStatus,
}: RunTraceCtaCardProps) {
  return (
    <section className="rounded-2xl border border-[var(--cf-border)] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-[var(--cf-navy)]">
              Run trace
            </h2>

            <span className="rounded-full bg-[var(--cf-blue-soft)] px-3 py-1 text-sm font-semibold text-[var(--cf-blue)]">
              Observability
            </span>
          </div>

          <p className="mt-2 max-w-3xl text-sm text-[var(--cf-muted)]">
            Inspect gateway calls, prompt/model versions, latency, cost, agent decisions, guardrails, memory influence, review events, and follow-up state.
          </p>

          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-[var(--cf-panel-muted)] px-3 py-1 font-medium text-[var(--cf-slate)]">
              Run: {status}
            </span>

            <span className="rounded-full bg-[var(--cf-panel-muted)] px-3 py-1 font-medium text-[var(--cf-slate)]">
              Review: {reviewTaskStatus ?? "No review task"}
            </span>
          </div>
        </div>

        <Link
          href={`/runs/${runId}/trace`}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[var(--cf-navy)] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[var(--cf-navy-soft)]"
        >
          Open trace
        </Link>
      </div>
    </section>
  );
}

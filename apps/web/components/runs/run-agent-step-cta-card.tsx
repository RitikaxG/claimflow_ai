"use client";

import Link from "next/link";

type RunAgentStepCtaCardProps = {
    runId : string,
    latestActionStatus? : string | null,
    latestActionType? : string | null,
    reviewTaskStatus? : string | null,
};

export function RunAgentStepCtaCard({
    runId,
    latestActionStatus,
    latestActionType,
    reviewTaskStatus,
} : RunAgentStepCtaCardProps) {
    return (
        <section className="rounded-2xl border border-[var(--cf-border)] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-[var(--cf-navy)]">
                            Agent workflow
                        </h2>

                        <span className="rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                            Guarded action
                        </span>
                    </div>

                    <p className="mt-1 max-w-3xl text-sm text-[var(--cf-muted)]">
                        Run one workflow step. Agent logs and follow-up drafts open on a dedicated page.
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-[var(--cf-panel-muted)] px-3 py-1 text-[var(--cf-slate)]">
                            Review: {reviewTaskStatus ?? "No review task"}
                        </span>

                        {latestActionType ? (
                            <span className="rounded-full bg-[var(--cf-panel-muted)] px-3 py-1 text-[var(--cf-slate)]">
                                Latest: {latestActionType}
                            </span>
                        ) : null}

                        {latestActionStatus ? (
                            <span className="rounded-full bg-[var(--cf-panel-muted)] px-3 py-1 text-[var(--cf-slate)]">
                                Status: {latestActionStatus}
                            </span>
                        ) : null}
                    </div>
                </div>

                <Link
                    href={`/runs/${runId}/agent-step`}
                    className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[var(--cf-navy)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--cf-navy-soft)]"
                >
                    Open agent
                </Link>
            </div>
        </section>
    );
}

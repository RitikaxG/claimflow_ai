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
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Agent Workflow
                        </h2>

                        <span className="rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                            Week 4 Agent
                        </span>
                    </div>

                    <p className="mt-1 max-w-3xl text-sm text-gray-500">
                        Run one guarded workflow step. Agent logs and follow-up drafts
                        open on a dedicated page.
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
                            Review: {reviewTaskStatus ?? "No review task"}
                        </span>

                        {latestActionType ? (
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
                                Latest: {latestActionType}
                            </span>
                        ) : null}

                        {latestActionStatus ? (
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
                                Status: {latestActionStatus}
                            </span>
                        ) : null}
                    </div>
                </div>

                <Link
                    href={`/runs/${runId}/agent-step`}
                    className="inline-flex shrink-0 items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
                >
                    Open agent page
                </Link>
            </div>
        </section>
    );
}
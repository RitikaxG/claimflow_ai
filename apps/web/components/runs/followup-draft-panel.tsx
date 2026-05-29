import Link from "next/link";
import type { FollowupDraftRecord } from "../../store/use-dashboard-store";

type FollowupDraftPanelProps = {
    draft : FollowupDraftRecord | null,
    reviewTaskId? : string | null,
    reviewTaskStatus? : string | null,
};

function formatJson(value : unknown) {
    if(value === null || value === undefined){
        return "—";
    }

    try{
        return JSON.stringify(value,null,2);
    }catch{
        return String(value);
    }
}

export function FollowupDraftPanel({
    draft,
    reviewTaskId,
    reviewTaskStatus,
} : FollowupDraftPanelProps) {
    if(!draft){
        return (
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">
                    Follow-up Draft
                </h2>

                <p className="mt-3 text-sm text-gray-500">
                    No follow-up draft has been created for this run yet.
                </p>
            </section>
        );
    }

    return (
        <section className="rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Follow-up Draft
                        </h2>

                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                            {draft.status}
                        </span>

                        {reviewTaskStatus ? (
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700">
                                Review: {reviewTaskStatus}
                            </span>
                        ) : null}
                    </div>

                    <p className="mt-2 text-sm text-amber-800">
                        This draft asks the claimant for missing evidence. The review is
                        paused until the requested document is received.
                    </p>
                </div>

                {reviewTaskId ? (
                    <Link
                        href={`/review/${reviewTaskId}`}
                        className="inline-flex shrink-0 items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
                    >
                        Open review task
                    </Link>
                ) : null}
            </div>

            <div className="mt-4 rounded-xl bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Subject
                </p>

                <p className="mt-1 text-sm font-semibold text-gray-900">
                    {draft.subject}
                </p>
            </div>

            <div className="mt-4 rounded-xl bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Body
                </p>

                <pre className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                    {draft.body}
                </pre>
            </div>

            <details className="mt-4 rounded-xl bg-white p-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-700">
                    Requested evidence JSON
                </summary>

                <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs text-gray-600">
                    {formatJson(draft.requestedEvidence)}
                </pre>
            </details>

            <div className="mt-4 rounded-xl border border-amber-200 bg-white p-4">
                <p className="text-sm font-medium text-gray-900">
                    Next step
                </p>

                <p className="mt-1 text-sm text-gray-600">
                    Open the review task to continue the evidence follow-up workflow.
                    In Day 6, this review page will get the additional-evidence upload
                    and reopen controls.
                </p>
            </div>
        </section>
    );
}
import type { AgentActionLogRecord } from "../../store/use-dashboard-store";

type AgentActionLogCardProps = {
    logs : AgentActionLogRecord[],
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

function formatDate(value : string) {
    return new Date(value).toLocaleString();
}

function getLatestExecutedOrBlockedLog(logs : AgentActionLogRecord[]) {
    return logs.find((log) => log.status === "EXECUTED" || log.status === "BLOCKED")
        ?? logs[0]
        ?? null;
}

export function AgentActionLogCard({ logs } : AgentActionLogCardProps) {
    const latestDecisionLog = getLatestExecutedOrBlockedLog(logs);
    const recentLogs = logs.slice(0,5);

    return (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                        Agent Action Logs
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                        Shows recent proposed, executed, blocked, or failed actions for
                        this run only.
                    </p>
                </div>

                <span className="text-xs text-gray-500">
                    Showing latest {recentLogs.length}
                </span>
            </div>

            {latestDecisionLog ? (
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Action
                        </p>

                        <p className="mt-2 break-words text-sm font-semibold text-gray-900">
                            {latestDecisionLog.action}
                        </p>
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Tool
                        </p>

                        <p className="mt-2 break-words text-sm font-semibold text-gray-900">
                            {latestDecisionLog.toolName ?? "—"}
                        </p>
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Guardrail
                        </p>

                        <p className="mt-2 text-sm font-semibold text-gray-900">
                            {latestDecisionLog.guardrailDecision ?? "Pending"}
                        </p>
                    </div>
                </div>
            ) : null}

            {latestDecisionLog?.blockedReason ? (
                <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                    <span className="font-medium">Blocked reason:</span>{" "}
                    {latestDecisionLog.blockedReason}
                </div>
            ) : null}

            {latestDecisionLog?.rationale ? (
                <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
                    <span className="font-medium">Rationale:</span>{" "}
                    {latestDecisionLog.rationale}
                </div>
            ) : null}

            {recentLogs.length === 0 ? (
                <p className="mt-5 text-sm text-gray-500">
                    No agent actions have been logged yet.
                </p>
            ) : (
                <div className="mt-5 space-y-3">
                    {recentLogs.map((log) => (
                        <details
                            key={log.id}
                            className="rounded-xl border border-gray-100 p-4"
                        >
                            <summary className="cursor-pointer">
                                <div className="inline-flex flex-wrap items-center gap-2 text-sm">
                                    <span className="font-medium text-gray-900">
                                        {log.action}
                                    </span>

                                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                        {log.status}
                                    </span>

                                    {log.guardrailDecision ? (
                                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                            {log.guardrailDecision}
                                        </span>
                                    ) : null}

                                    <span className="text-xs text-gray-400">
                                        {formatDate(log.createdAt)}
                                    </span>
                                </div>
                            </summary>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                        Tool input
                                    </p>

                                    <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                                        {formatJson(log.toolInputJson)}
                                    </pre>
                                </div>

                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                        Tool output
                                    </p>

                                    <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                                        {formatJson(log.toolOutputJson)}
                                    </pre>
                                </div>
                            </div>
                        </details>
                    ))}
                </div>
            )}
        </section>
    );
}
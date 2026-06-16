import type { AgentActionTraceRecord } from "../../lib/runs/run-trace-types";

function badgeClasses(action: AgentActionTraceRecord) {
  if (action.guardrailDecision === "BLOCKED" || action.status === "BLOCKED") {
    return "bg-red-100 text-red-800";
  }

  if (action.guardrailDecision === "ALLOWED" || action.status === "EXECUTED") {
    return "bg-emerald-100 text-emerald-800";
  }

  return "bg-gray-100 text-gray-700";
}

export function AgentDecisionCard({
  action,
}: {
  action: AgentActionTraceRecord;
}) {
  return (
    <article className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-950">Agent action</p>
          <p className="mt-1 text-sm text-gray-600">{action.action}</p>
        </div>

        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClasses(action)}`}>
          {action.guardrailDecision ?? action.status}
        </span>
      </div>

      {action.rationale ? (
        <p className="mt-4 text-sm text-gray-700">
          <span className="font-semibold text-gray-950">Why:</span>{" "}
          {action.rationale}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Status
          </p>
          <p className="mt-1 text-sm font-medium text-gray-950">
            {action.status}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Tool
          </p>
          <p className="mt-1 text-sm font-medium text-gray-950">
            {action.toolName ?? "None"}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Memory used
          </p>
          <p className="mt-1 text-sm font-medium text-gray-950">
            {action.memoryHitCount}
          </p>
        </div>
      </div>

      {action.blockedReason ? (
        <div className="mt-4 rounded-lg border border-red-100 bg-white p-3 text-sm text-red-800">
          <span className="font-semibold">Blocked reason:</span>{" "}
          {action.blockedReason}
        </div>
      ) : null}
    </article>
  );
}
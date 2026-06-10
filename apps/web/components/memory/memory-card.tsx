"use client";

import { useState } from "react";
import type { RunMemoryAuditItemRecord } from "../../store/use-dashboard-store";
import { MemoryMatchSignals } from "./memory-match-signals";
import { MemoryRiskBadge } from "./memory-risk-badge";
import { MemoryStatusBadge } from "./memory-status-badge";
import { MemoryUpdatesList } from "./memory-updates-list";

type MemoryCardProps = {
  memory: RunMemoryAuditItemRecord;
  showFeedbackActions?: boolean;
  isFeedbackBusy?: boolean;
  onFeedback?: (
    memory: RunMemoryAuditItemRecord,
    relevance: "CONFIRMED_RELEVANT" | "IRRELEVANT",
    note: string,
  ) => void;
};

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function MemoryCard({
  memory,
  showFeedbackActions = false,
  isFeedbackBusy = false,
  onFeedback,
}: MemoryCardProps) {
  const [note, setNote] = useState("");

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {memory.kind.replaceAll("_", " ")}
          </p>

          <h3 className="mt-1 text-base font-semibold text-gray-950">
            {memory.summary}
          </h3>
        </div>

        <div className="flex flex-wrap gap-2">
          <MemoryRiskBadge riskLevel={memory.riskLevel} />
          <MemoryStatusBadge status={memory.status} />

          {memory.usedByAgent ? (
            <span className="inline-flex rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">
              Used by agent
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-gray-700 md:grid-cols-3">
        <p>
          Score: <span className="font-semibold text-gray-950">{memory.score}</span>
        </p>

        <p>
          Confidence:{" "}
          <span className="font-semibold text-gray-950">
            {formatPercent(memory.confidence)}
          </span>
        </p>

        <p>
          Entity:{" "}
          <span className="font-semibold text-gray-950">
            {memory.entityType && memory.entityId
              ? `${memory.entityType}:${memory.entityId}`
              : "generic"}
          </span>
        </p>

        {memory.fieldPath ? (
          <p className="md:col-span-3">
            Field path:{" "}
            <span className="font-semibold text-gray-950">{memory.fieldPath}</span>
          </p>
        ) : null}
      </div>

      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
        <h4 className="text-sm font-semibold text-blue-900">Safe use</h4>
        <p className="mt-1 text-sm text-blue-800">{memory.safeUse}</p>
      </div>

      <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4">
        <h4 className="text-sm font-semibold text-red-900">Must not do</h4>

        {memory.mustNotDo.length > 0 ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-800">
            {memory.mustNotDo.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-red-800">
            No explicit must-not-do rules recorded.
          </p>
        )}
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-semibold text-gray-950">Matched on</h4>
        <div className="mt-2">
          <MemoryMatchSignals matchedOn={memory.matchedOn} />
        </div>
      </div>

      {memory.retrievalReason ? (
        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <h4 className="text-sm font-semibold text-gray-950">
            Retrieval reason
          </h4>
          <p className="mt-1 text-sm text-gray-700">{memory.retrievalReason}</p>
        </div>
      ) : null}

      <details className="mt-4 rounded-xl border border-gray-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-950">
          Source and update audit
        </summary>

        <div className="space-y-4 border-t border-gray-100 p-4">
          <div className="grid gap-2 text-sm text-gray-700 md:grid-cols-2">
            <p>Source run: {memory.sourceRunId ?? "n/a"}</p>
            <p>Source review decision: {memory.sourceReviewDecisionId ?? "n/a"}</p>
            <p>Agent action: {memory.agentAction ?? "n/a"}</p>
            <p>Agent action status: {memory.agentActionStatus ?? "n/a"}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-950">
              Memory updates
            </h4>
            <div className="mt-2">
              <MemoryUpdatesList updates={memory.updates} />
            </div>
          </div>
        </div>
      </details>

      <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-900">
        Memory is not claim evidence. Use it only to decide what a human should
        verify.
      </p>

      {showFeedbackActions && onFeedback ? (
        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Optional memory feedback note
            </span>

            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Example: This prior correction is relevant because the same policy number field is missing again."
              className="mt-2 min-h-20 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-950 placeholder:text-gray-400 outline-none focus:border-gray-400"
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isFeedbackBusy}
              onClick={() => onFeedback(memory, "CONFIRMED_RELEVANT", note)}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              Relevant
            </button>

            <button
              type="button"
              disabled={isFeedbackBusy}
              onClick={() => onFeedback(memory, "IRRELEVANT", note)}
              className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              Irrelevant
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
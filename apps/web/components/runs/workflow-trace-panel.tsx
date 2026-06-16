"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import type {
  RunTraceResponse,
  RunTraceSource,
} from "../../lib/runs/run-trace-types";
import { GatewayCallCard } from "./gateway-call-card";
import { AgentDecisionCard } from "./agent-decision-card";
import { MemoryHitCard } from "./memory-hit-card";

function formatCost(value: number) {
  return `$${value.toFixed(6)}`;
}

function formatSource(source: RunTraceSource) {
  return source.charAt(0).toUpperCase() + source.slice(1);
}

function sourceClasses(source: RunTraceSource) {
  switch (source) {
    case "gateway":
      return "bg-indigo-100 text-indigo-800";
    case "agent":
      return "bg-purple-100 text-purple-800";
    case "memory":
      return "bg-blue-100 text-blue-800";
    case "review":
      return "bg-emerald-100 text-emerald-800";
    case "rag":
      return "bg-amber-100 text-amber-800";
    case "followup":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 break-words text-lg font-semibold text-gray-950">
        {value}
      </p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function WorkflowTracePanel({ runId }: { runId: string }) {
  const [trace, setTrace] = useState<RunTraceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);

    axios
      .get<RunTraceResponse>(`/api/extraction-runs/${runId}/trace`)
      .then((res) => setTrace(res.data))
      .catch(() => setError("Failed to load workflow trace."));
  }, [runId]);

  if (error) {
    return (
      <section className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">
        {error}
      </section>
    );
  }

  if (!trace) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">Loading workflow trace...</p>
      </section>
    );
  }

  const latestAgentActions = [...trace.agentActions].reverse().slice(0, 3);
  const topMemoryHits = trace.memoryHits.slice(0, 3);

  return (
    <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-medium text-gray-500">
          Week 6 · Run-level trace
        </p>
        <h2 className="mt-1 text-lg font-semibold text-gray-950">
          Workflow trace and gateway visibility
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-gray-600">
          End-to-end explanation of the claim run: model calls, prompt/model
          versions, agent actions, guardrails, memory influence, review, and
          follow-up state.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryCard label="Trace ID" value={trace.traceId ?? "Not recorded"} />
        <SummaryCard label="AI calls" value={trace.summary.totalAiCalls} />
        <SummaryCard
          label="Failed/retryable"
          value={`${trace.summary.failedAiCalls}/${trace.summary.retryableFailures}`}
        />
        <SummaryCard
          label="Total latency"
          value={`${trace.summary.totalLatencyMs} ms`}
        />
        <SummaryCard
          label="Estimated cost"
          value={formatCost(trace.summary.totalCostUsd)}
        />
        <SummaryCard
          label="Agent actions"
          value={trace.summary.totalAgentActions}
        />
        <SummaryCard
          label="Memory used"
          value={`${trace.summary.usedMemoryHits}/${trace.summary.totalMemoryHits}`}
        />
        <SummaryCard
          label="Review status"
          value={trace.summary.reviewStatus ?? "No review task"}
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-950">
          Gateway visibility
        </h3>

        {trace.gatewayCalls.length === 0 ? (
          <p className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
            No AI gateway calls have been logged for this run yet.
          </p>
        ) : (
          <div className="space-y-3">
            {trace.gatewayCalls.map((call) => (
              <GatewayCallCard key={call.id} call={call} />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-950">Agent decisions</h3>

        {latestAgentActions.length === 0 ? (
          <p className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
            No agent actions have been proposed for this run yet.
          </p>
        ) : (
          <div className="space-y-3">
            {latestAgentActions.map((action) => (
              <AgentDecisionCard key={action.id} action={action} />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-950">
          Memory influence
        </h3>

        {topMemoryHits.length === 0 ? (
          <p className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
            No workflow memory has been retrieved for this run yet.
          </p>
        ) : (
          <div className="space-y-3">
            {topMemoryHits.map((hit) => (
              <MemoryHitCard key={hit.id} hit={hit} runId={runId} />
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-gray-950">
            End-to-end timeline
          </h3>
          <p className="text-xs text-gray-500">
            {trace.timeline.length} trace events
          </p>
        </div>

        <ol className="mt-4 space-y-4 border-l border-gray-200 pl-4">
          {trace.timeline.map((item) => (
            <li key={item.id} className="relative pl-5">
              <span className="absolute left-[-21px] top-1.5 h-3 w-3 rounded-full bg-gray-950" />

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${sourceClasses(
                      item.source,
                    )}`}
                  >
                    {formatSource(item.source)}
                  </span>

                  {item.status ? (
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-700">
                      {item.status}
                    </span>
                  ) : null}
                </div>

                <p className="mt-3 text-sm font-semibold text-gray-950">
                  {item.title}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {item.description}
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  {formatDate(item.timestamp)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
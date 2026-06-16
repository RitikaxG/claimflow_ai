import type { GatewayCallTraceRecord } from "../../lib/runs/run-trace-types";

function formatCost(value: number | null) {
  if (value === null) return "Not recorded";
  return `$${value.toFixed(6)}`;
}

function formatLatency(value: number | null) {
  if (value === null) return "Not recorded";
  return `${value} ms`;
}

function statusClasses(call: GatewayCallTraceRecord) {
  if (call.status === "SUCCEEDED" && call.errorType === "LATENCY_SPIKE") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  if (call.status === "SUCCEEDED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }

  if (call.status === "RETRYABLE") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-red-200 bg-red-50 text-red-900";
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-gray-950">
        {value}
      </p>
    </div>
  );
}

export function GatewayCallCard({ call }: { call: GatewayCallTraceRecord }) {
  return (
    <article className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-950">AI Call</p>
          <p className="mt-1 text-sm text-gray-600">{call.kind}</p>
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(
            call,
          )}`}
        >
          {call.status}
        </span>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Field label="Provider" value={call.provider} />
        <Field label="Model" value={call.model} />
        <Field label="Model version" value={call.modelVersion ?? "Missing"} />
        <Field label="Prompt version" value={call.promptVersion ?? "Missing"} />
        <Field label="Schema version" value={call.schemaVersion ?? "Missing"} />
        <Field label="Trace ID" value={call.traceId} />
        <Field label="Latency" value={formatLatency(call.latencyMs)} />
        <Field label="Estimated cost" value={formatCost(call.estimatedCostUsd)} />
        <Field label="Retryable" value={call.retryable ? "Yes" : "No"} />
      </div>

      {call.errorType || call.errorMessage ? (
        <div className="mt-4 rounded-lg border border-red-100 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
            Failure type
          </p>
          <p className="mt-1 text-sm font-medium text-red-900">
            {call.errorType ?? "UNKNOWN"}
          </p>
          {call.errorMessage ? (
            <p className="mt-1 text-sm text-red-700">{call.errorMessage}</p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
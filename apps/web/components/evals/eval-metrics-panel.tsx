function formatValue(value: unknown) {
  if (typeof value === "number") {
    if (value >= 0 && value <= 1) return `${(value * 100).toFixed(1)}%`;
    return Number.isInteger(value) ? String(value) : value.toFixed(4);
  }

  if (value === null || value === undefined) return "none";
  return String(value);
}

export function EvalMetricsPanel({ metrics }: { metrics: unknown }) {
  const metricRows =
    metrics && typeof metrics === "object" && !Array.isArray(metrics)
      ? Object.entries(metrics as Record<string, unknown>)
      : [];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-950">Metrics</h2>

      {metricRows.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">No metrics recorded.</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metricRows.map(([key, value]) => (
            <div key={key} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {key.replaceAll("_", " ")}
              </p>
              <p className="mt-1 text-lg font-semibold text-gray-950">
                {formatValue(value)}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
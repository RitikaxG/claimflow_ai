function humanizeMetricKey(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isRateMetric(key: string) {
  const normalized = key.toLowerCase();

  return (
    normalized.includes("rate") ||
    normalized.includes("accuracy") ||
    normalized.includes("precision") ||
    normalized.includes("recall")
  );
}

function formatValue(key: string, value: unknown) {
  if (typeof value === "number") {
    if (isRateMetric(key)) return `${(value * 100).toFixed(1)}%`;
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(4);
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
                {humanizeMetricKey(key)}
              </p>
              <p className="mt-1 text-lg font-semibold text-gray-950">
                {formatValue(key, value)}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
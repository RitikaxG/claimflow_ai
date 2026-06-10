import type { MemoryUpdateRecord } from "../../store/use-dashboard-store";

type MemoryUpdatesListProps = {
  updates: MemoryUpdateRecord[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function MemoryUpdatesList({ updates }: MemoryUpdatesListProps) {
  if (updates.length === 0) {
    return <p className="text-sm text-gray-500">No memory updates yet.</p>;
  }

  return (
    <div className="space-y-2">
      {updates.map((update) => (
        <div
          key={update.id}
          className="rounded-xl border border-gray-100 bg-gray-50 p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-950">
              {update.updateType.replaceAll("_", " ")}
            </p>

            <p className="text-xs text-gray-500">{formatDate(update.createdAt)}</p>
          </div>

          <p className="mt-1 text-xs text-gray-600">
            {update.beforeStatus ?? "unknown"} → {update.afterStatus ?? "unknown"}
            {typeof update.confidenceDelta === "number"
              ? ` · confidence ${update.confidenceDelta > 0 ? "+" : ""}${update.confidenceDelta}`
              : ""}
          </p>

          {update.note ? (
            <p className="mt-2 text-sm text-gray-700">{update.note}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
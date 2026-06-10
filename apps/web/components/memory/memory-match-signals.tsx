import type { MemoryMatchSignalRecord } from "../../store/use-dashboard-store";

type MemoryMatchSignalsProps = {
  matchedOn: MemoryMatchSignalRecord[];
};

export function MemoryMatchSignals({ matchedOn }: MemoryMatchSignalsProps) {
  if (matchedOn.length === 0) {
    return <p className="text-sm text-gray-500">No match signals recorded.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {matchedOn.map((signal, index) => (
        <span
          key={`${signal.type}-${signal.value}-${index}`}
          className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700"
        >
          {signal.type.replaceAll("_", " ")} · {signal.value} · +{signal.points}
        </span>
      ))}
    </div>
  );
}
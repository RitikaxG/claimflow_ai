import type { ExtractionEventRecord } from "../../store/use-dashboard-store";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

type TimelineEventItemProps = {
  event: ExtractionEventRecord;
};

export function TimelineEventItem({ event }: TimelineEventItemProps) {
  return (
    <li className="relative pl-7">
      <span className="absolute left-0 top-1.5 h-3 w-3 rounded-full bg-gray-950" />

      <div className="space-y-1">
        <p className="text-sm font-semibold text-gray-950">{event.type}</p>
        <p className="text-sm text-gray-600">{event.message}</p>
        <p className="text-xs text-gray-400">{formatDate(event.createdAt)}</p>
      </div>
    </li>
  );
}
import type { ExtractionEventRecord } from "../../store/use-dashboard-store";
import { TimelineEventItem } from "./timeline-event-item";

type RunTimelineProps = {
  events: ExtractionEventRecord[];
  title?: string;
  maxItems?: number;
  includeTypes?: string[];
  excludeTypes?: string[];
};

function shouldShowEvent(
  event: ExtractionEventRecord,
  includeTypes?: string[],
  excludeTypes?: string[],
) {
  if (includeTypes && includeTypes.length > 0) {
    return includeTypes.includes(event.type);
  }

  if (excludeTypes && excludeTypes.length > 0) {
    return !excludeTypes.includes(event.type);
  }

  return true;
}

export function RunTimeline({
  events,
  title = "Timeline",
  maxItems = 8,
  includeTypes,
  excludeTypes,
}: RunTimelineProps) {
  const filteredEvents = events.filter((event) =>
    shouldShowEvent(event, includeTypes, excludeTypes),
  );

  const recentEvents = [...filteredEvents]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, maxItems);

  const hiddenCount = Math.max(0, filteredEvents.length - recentEvents.length);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg font-semibold text-gray-950">{title}</h2>

        {filteredEvents.length > 0 ? (
          <p className="text-xs text-gray-500">
            Showing latest {recentEvents.length}
            {hiddenCount > 0 ? ` of ${filteredEvents.length}` : ""}
          </p>
        ) : null}
      </div>

      {filteredEvents.length === 0 ? (
        <p className="mt-5 text-sm text-gray-500">No timeline events yet.</p>
      ) : (
        <ol className="mt-5 space-y-5 border-l border-gray-200 pl-4">
          {recentEvents.map((event) => (
            <TimelineEventItem key={event.id} event={event} />
          ))}
        </ol>
      )}
    </section>
  );
}
import type { ExtractionEventRecord } from "../../store/use-dashboard-store";
import { TimelineEventItem } from "./timeline-event-item";

type RunTimelineProps = {
  events: ExtractionEventRecord[];
};

export function RunTimeline({ events }: RunTimelineProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-950">Timeline</h2>

      {events.length === 0 ? (
        <p className="mt-5 text-sm text-gray-500">No timeline events yet.</p>
      ) : (
        <ol className="mt-5 space-y-5 border-l border-gray-200 pl-4">
          {events.map((event) => (
            <TimelineEventItem key={event.id} event={event} />
          ))}
        </ol>
      )}
    </section>
  );
}
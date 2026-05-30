"use client";

import Link from "next/link";
import type {
  ExtractionEventRecord,
  ReviewTaskRecord,
} from "../../store/use-dashboard-store";

type ReceivedEvidenceItem = {
  label: string;
  note?: string;
  sourceEventId: string;
  receivedAt: string;
};

type ReceivedFieldValue = {
  field: string;
  label?: string;
  value: string;
  note?: string;
  sourceEventId: string;
  receivedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getReceivedInfoEvents(events: ExtractionEventRecord[]) {
  return events.filter(
    (event) =>
      event.type === "ADDITIONAL_INFORMATION_RECEIVED" ||
      event.type === "ADDITIONAL_EVIDENCE_RECEIVED",
  );
}

function getEvidenceItemsFromEvent(
  event: ExtractionEventRecord,
): ReceivedEvidenceItem[] {
  if (!isRecord(event.metadata)) {
    return [];
  }

  const evidenceItems = event.metadata.evidenceItems;

  if (!Array.isArray(evidenceItems)) {
    return [];
  }

  return evidenceItems
    .map((item): ReceivedEvidenceItem | null => {
      if (!isRecord(item)) {
        return null;
      }

      const label = getString(item.label);
      const note = getString(item.note);

      if (!label) {
        return null;
      }

      return {
        label,
        ...(note ? { note } : {}),
        sourceEventId: event.id,
        receivedAt: event.createdAt,
      };
    })
    .filter((item): item is ReceivedEvidenceItem => item !== null);
}

function getFieldValuesFromEvent(
  event: ExtractionEventRecord,
): ReceivedFieldValue[] {
  if (!isRecord(event.metadata)) {
    return [];
  }

  const fieldValues = event.metadata.fieldValues;

  if (!Array.isArray(fieldValues)) {
    return [];
  }

  return fieldValues
    .map((item): ReceivedFieldValue | null => {
      if (!isRecord(item)) {
        return null;
      }

      const field = getString(item.field);
      const label = getString(item.label);
      const value = getString(item.value);
      const note = getString(item.note);

      if (!field || !value) {
        return null;
      }

      return {
        field,
        ...(label ? { label } : {}),
        value,
        ...(note ? { note } : {}),
        sourceEventId: event.id,
        receivedAt: event.createdAt,
      };
    })
    .filter((item): item is ReceivedFieldValue => item !== null);
}

function getLatestReceivedAt(events: ExtractionEventRecord[]) {
  const receivedEvents = getReceivedInfoEvents(events);

  if (receivedEvents.length === 0) {
    return null;
  }

  return receivedEvents
    .map((event) => event.createdAt)
    .sort((left, right) => {
      return new Date(right).getTime() - new Date(left).getTime();
    })[0];
}

function wasReviewReopenedAfterReceivedInfo(events: ExtractionEventRecord[]) {
  const latestReceivedAt = getLatestReceivedAt(events);

  if (!latestReceivedAt) {
    return false;
  }

  const latestReceivedTime = new Date(latestReceivedAt).getTime();

  return events.some((event) => {
    if (event.type !== "REVIEW_REOPENED") {
      return false;
    }

    return new Date(event.createdAt).getTime() >= latestReceivedTime;
  });
}

function canRunAgentAgainAfterInfo(task: ReviewTaskRecord) {
  const hasReceivedInfo = getReceivedInfoEvents(task.run.events).length > 0;

  return (
    hasReceivedInfo &&
    (task.status === "PENDING" || task.status === "IN_REVIEW")
  );
}

export function ReceivedInformationSummaryCard({
  task,
}: {
  task: ReviewTaskRecord;
}) {
  const receivedInfoEvents = getReceivedInfoEvents(task.run.events);

  if (receivedInfoEvents.length === 0) {
    return null;
  }

  const evidenceItems = receivedInfoEvents.flatMap(getEvidenceItemsFromEvent);
  const fieldValues = receivedInfoEvents.flatMap(getFieldValuesFromEvent);
  const reviewReopened = wasReviewReopenedAfterReceivedInfo(task.run.events);
  const showRunAgentAgainCta = canRunAgentAgainAfterInfo(task);

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-950">
              Received information
            </h2>

            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-800">
              {reviewReopened ? "Review reopened" : "Recorded"}
            </span>

            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700">
              Current review: {task.status.replaceAll("_", " ")}
            </span>
          </div>

          <p className="mt-2 max-w-3xl text-sm text-emerald-800">
            These items were received after the information request. Original AI
            extraction remains unchanged; final corrected claim data still
            belongs in the human review correction path.
          </p>
        </div>

        {showRunAgentAgainCta ? (
          <Link
            href={`/runs/${task.run.id}/agent-step`}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            Run agent again after received info
          </Link>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Evidence received
          </p>

          {evidenceItems.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {evidenceItems.map((item) => (
                <li
                  key={`${item.sourceEventId}-${item.label}`}
                  className="rounded-lg border border-emerald-100 bg-emerald-50 p-3"
                >
                  <p className="text-sm font-semibold text-gray-950">
                    {item.label}
                  </p>

                  {item.note ? (
                    <p className="mt-1 text-sm text-gray-700">{item.note}</p>
                  ) : null}

                  <p className="mt-1 text-xs text-gray-500">
                    Received: {formatDate(item.receivedAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-gray-500">
              No evidence item was recorded.
            </p>
          )}
        </div>

        <div className="rounded-xl bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Field values received
          </p>

          {fieldValues.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {fieldValues.map((item) => (
                <li
                  key={`${item.sourceEventId}-${item.field}`}
                  className="rounded-lg border border-emerald-100 bg-emerald-50 p-3"
                >
                  <p className="text-sm font-semibold text-gray-950">
                    {item.label ?? item.field}
                  </p>

                  <p className="mt-1 font-mono text-xs text-gray-500">
                    {item.field}
                  </p>

                  <p className="mt-2 text-sm text-gray-700">
                    Value:{" "}
                    <span className="font-medium text-gray-950">
                      {item.value}
                    </span>
                  </p>

                  {item.note ? (
                    <p className="mt-1 text-sm text-gray-700">{item.note}</p>
                  ) : null}

                  <p className="mt-1 text-xs text-gray-500">
                    Received: {formatDate(item.receivedAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-gray-500">
              No field value was recorded.
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-4">
        <p className="text-sm font-medium text-gray-950">Workflow status</p>

        <p className="mt-1 text-sm text-gray-700">
          Review reopened after received information:{" "}
          <span className="font-semibold">
            {reviewReopened ? "Yes" : "No"}
          </span>
        </p>

        {task.status === "PENDING" ? (
          <p className="mt-1 text-sm text-gray-700">
            Next: click <span className="font-semibold">Start review</span> to
            continue human verification.
          </p>
        ) : null}

        {task.status === "IN_REVIEW" ? (
          <p className="mt-1 text-sm text-gray-700">
            The reviewer can now approve, edit & approve, reject, or request
            more information again.
          </p>
        ) : null}
      </div>
    </section>
  );
}
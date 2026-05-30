import Link from "next/link";
import type {
  ExtractionEventRecord,
  FollowupDraftRecord,
} from "../../store/use-dashboard-store";

type FollowupDraftPanelProps = {
  draft: FollowupDraftRecord | null;
  reviewTaskId?: string | null;
  reviewTaskStatus?: string | null;
  events?: ExtractionEventRecord[];
};

function formatJson(value: unknown) {
  if (value === null || value === undefined) {
    return "—";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatRequestType(value?: string | null) {
  if (!value) {
    return "INFORMATION REQUEST";
  }

  return value.replaceAll("_", " ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeEvidenceLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeFieldKey(value: string) {
  return value.trim();
}

function getStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
}

function getReceivedEvidence(events: ExtractionEventRecord[]) {
  return events
    .filter(
      (event) =>
        event.type === "ADDITIONAL_INFORMATION_RECEIVED" ||
        event.type === "ADDITIONAL_EVIDENCE_RECEIVED",
    )
    .flatMap((event) => {
      if (!isRecord(event.metadata)) {
        return [];
      }

      const evidenceItems = event.metadata.evidenceItems;

      if (!Array.isArray(evidenceItems)) {
        return [];
      }

      return evidenceItems
        .map((item) => {
          if (!isRecord(item)) {
            return null;
          }

          return typeof item.label === "string" && item.label.trim().length > 0
            ? item.label
            : null;
        })
        .filter((item): item is string => item !== null);
    });
}

function getReceivedFields(events: ExtractionEventRecord[]) {
  return events
    .filter((event) => event.type === "ADDITIONAL_INFORMATION_RECEIVED")
    .flatMap((event) => {
      if (!isRecord(event.metadata)) {
        return [];
      }

      const fieldValues = event.metadata.fieldValues;

      if (!Array.isArray(fieldValues)) {
        return [];
      }

      return fieldValues
        .map((item) => {
          if (!isRecord(item)) {
            return null;
          }

          return typeof item.field === "string" && item.field.trim().length > 0
            ? item.field
            : null;
        })
        .filter((item): item is string => item !== null);
    });
}

function isSatisfiedDraftStatus(status?: string | null) {
  return status === "INFO_RECEIVED" || status === "RESOLVED";
}

function isDraftSatisfiedByEvents(input: {
  draft: FollowupDraftRecord;
  events: ExtractionEventRecord[];
}) {
  const requestedEvidence = getStringArray(input.draft.requestedEvidence);
  const requestedFields = getStringArray(input.draft.requestedFields);

  if (requestedEvidence.length === 0 && requestedFields.length === 0) {
    return false;
  }

  const receivedEvidenceKeys = new Set(
    getReceivedEvidence(input.events).map((item) => normalizeEvidenceLabel(item)),
  );

  const receivedFieldKeys = new Set(
    getReceivedFields(input.events).map((item) => normalizeFieldKey(item)),
  );

  const allEvidenceReceived = requestedEvidence.every((item) =>
    receivedEvidenceKeys.has(normalizeEvidenceLabel(item)),
  );

  const allFieldsReceived = requestedFields.every((item) =>
    receivedFieldKeys.has(normalizeFieldKey(item)),
  );

  return allEvidenceReceived && allFieldsReceived;
}

export function FollowupDraftPanel({
  draft,
  reviewTaskId,
  reviewTaskStatus,
  events = [],
}: FollowupDraftPanelProps) {
  if (!draft) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Information Request Draft
        </h2>

        <p className="mt-3 text-sm text-gray-500">
          No information request draft has been created for this run yet.
        </p>
      </section>
    );
  }

  const isSatisfied =
    isSatisfiedDraftStatus(draft.status) ||
    isDraftSatisfiedByEvents({
      draft,
      events,
    });

  return (
    <section
      className={
        isSatisfied
          ? "rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm"
          : "rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm"
      }
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {isSatisfied
                ? "Resolved information request"
                : "Information Request Draft"}
            </h2>

            <span
              className={
                isSatisfied
                  ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800"
                  : "rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800"
              }
            >
              {isSatisfied ? "INFO RECEIVED" : draft.status}
            </span>

            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700">
              {formatRequestType(draft.requestType)}
            </span>

            {reviewTaskStatus ? (
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700">
                Review: {reviewTaskStatus}
              </span>
            ) : null}
          </div>

          <p
            className={
              isSatisfied
                ? "mt-2 text-sm text-emerald-800"
                : "mt-2 text-sm text-amber-800"
            }
          >
            {isSatisfied
              ? "The requested information/evidence has been recorded. This request is kept for audit history only."
              : "This draft asks the claimant for missing information and/or documents. The review is paused until the requested items are received."}
          </p>
        </div>

        {reviewTaskId ? (
          <Link
            href={`/review/${reviewTaskId}`}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            {isSatisfied ? "Continue review" : "Open review task"}
          </Link>
        ) : null}
      </div>

      {isSatisfied ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-900">Next step</p>

          <p className="mt-1 text-sm text-gray-600">
            Continue from the review task. Start review again, then approve, edit
            & approve, reject, or request more info.
          </p>
        </div>
      ) : null}

      <details open={!isSatisfied} className="mt-4 rounded-xl bg-white p-4">
        <summary className="cursor-pointer text-sm font-medium text-gray-700">
          {isSatisfied ? "View original request draft" : "Request draft"}
        </summary>

        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Subject
          </p>

          <p className="mt-1 text-sm font-semibold text-gray-900">
            {draft.subject}
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Original request body
          </p>

          <pre className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
            {draft.body}
          </pre>
        </div>
      </details>

      <details className="mt-4 rounded-xl bg-white p-4">
        <summary className="cursor-pointer text-sm font-medium text-gray-700">
          Requested evidence JSON
        </summary>

        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs text-gray-600">
          {formatJson(draft.requestedEvidence)}
        </pre>
      </details>

      <details className="mt-4 rounded-xl bg-white p-4">
        <summary className="cursor-pointer text-sm font-medium text-gray-700">
          Requested fields JSON
        </summary>

        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs text-gray-600">
          {formatJson(draft.requestedFields)}
        </pre>
      </details>

      <details className="mt-4 rounded-xl bg-white p-4">
        <summary className="cursor-pointer text-sm font-medium text-gray-700">
          Field request metadata JSON
        </summary>

        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs text-gray-600">
          {formatJson(draft.fieldRequests)}
        </pre>
      </details>

      {!isSatisfied ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-900">Next step</p>

          <p className="mt-1 text-sm text-gray-600">
            Open the review task to record received information or evidence, then
            reopen the review.
          </p>
        </div>
      ) : null}
    </section>
  );
}
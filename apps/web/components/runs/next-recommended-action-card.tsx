"use client";

import Link from "next/link";
import type {
  ExtractionEventRecord,
  ExtractionRunRecord,
} from "../../store/use-dashboard-store";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringArrayFromRecord(value: unknown, key: string) {
  if (!isRecord(value)) {
    return [];
  }

  const field = value[key];

  return Array.isArray(field)
    ? field.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeEvidenceLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeFieldKey(value: string) {
  return value.trim();
}

function getReceivedEvidenceFromEvents(events: ExtractionEventRecord[]) {
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

function getReceivedFieldsFromEvents(events: ExtractionEventRecord[]) {
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

function removeReceivedEvidence(input: {
  requiredEvidence: string[];
  receivedEvidence: string[];
}) {
  const receivedKeys = new Set(
    input.receivedEvidence.map((item) => normalizeEvidenceLabel(item)),
  );

  return input.requiredEvidence.filter((item) => {
    return !receivedKeys.has(normalizeEvidenceLabel(item));
  });
}

function removeReceivedFields(input: {
  missingFields: string[];
  receivedFields: string[];
}) {
  const receivedKeys = new Set(
    input.receivedFields.map((item) => normalizeFieldKey(item)),
  );

  return input.missingFields.filter((item) => {
    return !receivedKeys.has(normalizeFieldKey(item));
  });
}

function hasReceivedInformation(events: ExtractionEventRecord[]) {
  return events.some(
    (event) =>
      event.type === "ADDITIONAL_INFORMATION_RECEIVED" ||
      event.type === "ADDITIONAL_EVIDENCE_RECEIVED",
  );
}

function isFinalReviewStatus(status?: string | null) {
  return (
    status === "APPROVED" ||
    status === "EDITED_AND_APPROVED" ||
    status === "REJECTED"
  );
}

export function NextRecommendedActionCard({
  run,
}: {
  run: ExtractionRunRecord;
}) {
  const rawMissingFields = getStringArrayFromRecord(
    run.validationJson,
    "missingFields",
  );

  const rawRequiredEvidence = getStringArrayFromRecord(
    run.validationJson,
    "requiredEvidence",
  );

  const receivedEvidence = getReceivedEvidenceFromEvents(run.events);
  const receivedFields = getReceivedFieldsFromEvents(run.events);

  const missingFields = removeReceivedFields({
    missingFields: rawMissingFields,
    receivedFields,
  });

  const requiredEvidence = removeReceivedEvidence({
    requiredEvidence: rawRequiredEvidence,
    receivedEvidence,
  });

  const reviewStatus = run.reviewTask?.status ?? null;
  const infoWasReceived = hasReceivedInformation(run.events);

  if (isFinalReviewStatus(reviewStatus)) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Next recommended action
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          No agent action is needed. Human review is already final with status{" "}
          <span className="font-semibold">{reviewStatus}</span>.
        </p>
      </section>
    );
  }

  if (reviewStatus === "NEEDS_MORE_INFO") {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Next recommended action
        </h2>

        <p className="mt-2 text-sm text-amber-800">
          Review is waiting for requested information or evidence.
        </p>

        {run.reviewTask ? (
          <Link
            href={`/review/${run.reviewTask.id}`}
            className="mt-4 inline-flex rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white"
          >
            Open review task
          </Link>
        ) : null}
      </section>
    );
  }

  if (missingFields.length > 0 || requiredEvidence.length > 0) {
    return (
      <section className="rounded-2xl border border-purple-100 bg-purple-50 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Next recommended action
        </h2>

        <p className="mt-2 text-sm text-purple-800">
          Missing claim information or evidence was detected. Run the guarded
          agent step to draft an information request and pause the review.
        </p>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl bg-white p-3">
            <p className="text-xs font-semibold uppercase text-gray-500">
              Unresolved missing fields
            </p>

            <p className="mt-1 text-sm text-gray-800">
              {missingFields.length > 0 ? missingFields.join(", ") : "None"}
            </p>
          </div>

          <div className="rounded-xl bg-white p-3">
            <p className="text-xs font-semibold uppercase text-gray-500">
              Unresolved required evidence
            </p>

            <p className="mt-1 text-sm text-gray-800">
              {requiredEvidence.length > 0
                ? requiredEvidence.join(", ")
                : "None"}
            </p>
          </div>
        </div>

        <Link
          href={`/runs/${run.id}/agent-step`}
          className="mt-4 inline-flex rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white"
        >
          Run agent step
        </Link>
      </section>
    );
  }

  if (infoWasReceived && (reviewStatus === "PENDING" || reviewStatus === "IN_REVIEW")) {
    return (
      <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Next recommended action
        </h2>

        <p className="mt-2 text-sm text-emerald-800">
          Requested information/evidence has been recorded. Continue human
          verification from the review task, or run the agent again to route the
          next safe workflow action.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          {run.reviewTask ? (
            <Link
              href={`/review/${run.reviewTask.id}`}
              className="inline-flex rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white"
            >
              Continue review
            </Link>
          ) : null}

          <Link
            href={`/runs/${run.id}/agent-step`}
            className="inline-flex rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-800"
          >
            Run agent again
          </Link>
        </div>
      </section>
    );
  }

  if (run.status === "COMPLETED" || run.status === "NEEDS_REVIEW") {
    return (
      <section className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Next recommended action
        </h2>

        <p className="mt-2 text-sm text-indigo-800">
          Claim has enough structured information for a policy-grounded coverage
          assessment.
        </p>

        <Link
          href={`/runs/${run.id}/coverage`}
          className="mt-4 inline-flex rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white"
        >
          Open coverage assessment
        </Link>
      </section>
    );
  }

  return null;
}
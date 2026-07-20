"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  useDashboardStore,
  type ReviewTaskRecord,
} from "../../store/use-dashboard-store";

type AdditionalInformationPanelProps = {
  task: ReviewTaskRecord;
};

type EvidenceItemInput = {
  label: string;
  note?: string;
};

type FieldValueInput = {
  field: string;
  label?: string;
  value: string;
  note?: string;
};

type FieldRequestView = {
  field: string;
  label: string;
  question?: string;
  acceptedEvidence?: string[];
  valueKind?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeLabel(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeIdentifier(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function evidenceContainsIdentifier(note: string, identifier: string) {
  const normalizedIdentifier = normalizeIdentifier(identifier);
  const candidates = note.match(/[a-z0-9][a-z0-9/_-]{3,}/gi) ?? [];

  return candidates.some(
    (candidate) => normalizeIdentifier(candidate) === normalizedIdentifier,
  );
}

function isFirField(value: string) {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return normalized === "firnumber" || normalized === "policefirnumber";
}

function isFirReferenceEvidence(value: string) {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return normalized.includes("fir");
}

function attachFirReference(note: string | undefined, firNumber: string) {
  const trimmedNote = note?.trim() ?? "";

  if (evidenceContainsIdentifier(trimmedNote, firNumber)) {
    return trimmedNote;
  }

  const firReference = `FIR number: ${firNumber}`;
  return trimmedNote ? `${firReference}\n${trimmedNote}` : firReference;
}

function uniqueLabels(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    const trimmed = value.trim();

    if (!trimmed) {
      return;
    }

    const key = normalizeLabel(trimmed);

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    result.push(trimmed);
  });

  return result;
}

function getLabelFromUnknown(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (!isRecord(value)) {
    return null;
  }

  const candidate =
    value.label ??
    value.evidenceType ??
    value.type ??
    value.name ??
    value.field;

  if (typeof candidate !== "string") {
    return null;
  }

  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getLabelsFromUnknown(value: unknown): string[] {
  if (Array.isArray(value)) {
    return uniqueLabels(
      value
        .map(getLabelFromUnknown)
        .filter((item): item is string => item !== null),
    );
  }

  if (!isRecord(value)) {
    return [];
  }

  const keysToTry = [
    "evidenceItems",
    "requestedEvidence",
    "missingEvidence",
    "requiredEvidence",
  ];

  for (const key of keysToTry) {
    const labels = getLabelsFromUnknown(value[key]);

    if (labels.length > 0) {
      return labels;
    }
  }

  const directLabel = getLabelFromUnknown(value);
  return directLabel ? [directLabel] : [];
}

function getFieldFromUnknown(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (!isRecord(value)) {
    return null;
  }

  const candidate = value.field ?? value.name ?? value.key;

  if (typeof candidate !== "string") {
    return null;
  }

  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getFieldsFromUnknown(value: unknown): string[] {
  if (Array.isArray(value)) {
    return uniqueLabels(
      value
        .map(getFieldFromUnknown)
        .filter((item): item is string => item !== null),
    );
  }

  if (!isRecord(value)) {
    return [];
  }

  const keysToTry = ["fieldValues", "requestedFields", "missingFields"];

  for (const key of keysToTry) {
    const fields = getFieldsFromUnknown(value[key]);

    if (fields.length > 0) {
      return fields;
    }
  }

  const directField = getFieldFromUnknown(value);
  return directField ? [directField] : [];
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0,
  );
}

function getFieldRequestsFromUnknown(value: unknown): FieldRequestView[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): FieldRequestView | null => {
      if (!isRecord(item)) {
        return null;
      }

      const field = typeof item.field === "string" ? item.field.trim() : "";
      const label = typeof item.label === "string" ? item.label.trim() : field;

      if (!field) {
        return null;
      }

      return {
        field,
        label: label || field,
        question:
          typeof item.question === "string" && item.question.trim().length > 0
            ? item.question.trim()
            : undefined,
        acceptedEvidence: getStringArray(item.acceptedEvidence),
        valueKind:
          typeof item.valueKind === "string" && item.valueKind.trim().length > 0
            ? item.valueKind.trim()
            : undefined,
      };
    })
    .filter((item): item is FieldRequestView => item !== null);
}

function getRequestedEvidence(task: ReviewTaskRecord): string[] {
  const latestDraft = task.run.followupDrafts?.[0] ?? null;

  const fromDraft = latestDraft
    ? getLabelsFromUnknown(latestDraft.requestedEvidence)
    : [];

  if (fromDraft.length > 0) {
    return fromDraft;
  }

  const fromReason = getLabelsFromUnknown(task.reasonJson);

  if (fromReason.length > 0) {
    return fromReason;
  }

  return getLabelsFromUnknown(task.run.validationJson);
}

function getRequestedFields(task: ReviewTaskRecord): string[] {
  const latestDraft = task.run.followupDrafts?.[0] ?? null;

  const fromDraft = latestDraft
    ? getFieldsFromUnknown(latestDraft.requestedFields)
    : [];

  if (fromDraft.length > 0) {
    return fromDraft;
  }

  const fromReason = getFieldsFromUnknown(task.reasonJson);

  if (fromReason.length > 0) {
    return fromReason;
  }

  return getFieldsFromUnknown(task.run.validationJson);
}

function getFieldRequests(task: ReviewTaskRecord): FieldRequestView[] {
  const latestDraft = task.run.followupDrafts?.[0] ?? null;

  const fromDraft = latestDraft
    ? getFieldRequestsFromUnknown(latestDraft.fieldRequests)
    : [];

  if (fromDraft.length > 0) {
    return fromDraft;
  }

  return getRequestedFields(task).map((field) => ({
    field,
    label: field,
  }));
}

function buildEvidenceItems(input: {
  selectedLabels: string[];
  notesByLabel: Record<string, string>;
  customEvidenceLabel: string;
  customEvidenceNote: string;
}): EvidenceItemInput[] {
  const selectedItems = input.selectedLabels.map((label) => {
    const note = input.notesByLabel[label]?.trim() ?? "";

    if (note) {
      return {
        label,
        note,
      };
    }

    return {
      label,
    };
  });

  const customLabel = input.customEvidenceLabel.trim();
  const customNote = input.customEvidenceNote.trim();

  const customItem: EvidenceItemInput[] = customLabel
    ? [
        customNote
          ? {
              label: customLabel,
              note: customNote,
            }
          : {
              label: customLabel,
            },
      ]
    : [];

  const allItems = [...selectedItems, ...customItem];
  const seen = new Set<string>();

  return allItems.filter((item) => {
    const key = normalizeLabel(item.label);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function buildFieldValueItems(input: {
  fieldRequests: FieldRequestView[];
  fieldValues: Record<string, string>;
  fieldNotes: Record<string, string>;
  customFieldName: string;
  customFieldLabel: string;
  customFieldValue: string;
  customFieldNote: string;
}): FieldValueInput[] {
  const requestedItems = input.fieldRequests
    .map((fieldRequest): FieldValueInput | null => {
      const value = input.fieldValues[fieldRequest.field]?.trim() ?? "";
      const note = input.fieldNotes[fieldRequest.field]?.trim() ?? "";

      if (!value) {
        return null;
      }

      return {
        field: fieldRequest.field,
        label: fieldRequest.label,
        value,
        ...(note ? { note } : {}),
      };
    })
    .filter((item): item is FieldValueInput => item !== null);

  const customField = input.customFieldName.trim();
  const customLabel = input.customFieldLabel.trim();
  const customValue = input.customFieldValue.trim();
  const customNote = input.customFieldNote.trim();

  const customItems: FieldValueInput[] =
    customField && customValue
      ? [
          {
            field: customField,
            ...(customLabel ? { label: customLabel } : {}),
            value: customValue,
            ...(customNote ? { note: customNote } : {}),
          },
        ]
      : [];

  const allItems: FieldValueInput[] = [...requestedItems, ...customItems];
  const seen = new Set<string>();

  return allItems.filter((item) => {
    const key = item.field.trim();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

type InformationIconName =
  | "check"
  | "clock"
  | "field"
  | "file"
  | "history"
  | "inbox"
  | "shield";

function InformationIcon({
  name,
  className = "h-4 w-4",
}: {
  name: InformationIconName;
  className?: string;
}) {
  const paths: Record<InformationIconName, React.ReactNode> = {
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    field: (
      <>
        <path d="M4 6h16M4 12h10M4 18h7" />
        <path d="M18 14v6M15 17h6" />
      </>
    ),
    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6M9 15h6" />
      </>
    ),
    history: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5M12 7v5l3 2" />
      </>
    ),
    inbox: (
      <>
        <path d="M22 12h-6l-2 3h-4l-2-3H2" />
        <path d="m5.5 5.5-3.5 6V20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8.5l-3.5-6A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.5Z" />
      </>
    ),
    shield: (
      <>
        <path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function humanizeField(value: string) {
  return value
    .split(".")
    .at(-1)!
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function reviewerDisplayName(value: string | null | undefined) {
  if (!value) return "Reviewer not recorded";
  return /\b(?:week\s*\d+|eval(?:uation)?)\b/i.test(value)
    ? "Claims reviewer"
    : value;
}

function formatRequestDate(value: string | null | undefined) {
  if (!value) {
    return "Date not recorded";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdditionalInformationPanel({
  task,
}: AdditionalInformationPanelProps) {
  const requestedEvidence = useMemo(() => getRequestedEvidence(task), [task]);
  const requestedFields = useMemo(() => getRequestedFields(task), [task]);
  const fieldRequests = useMemo(() => getFieldRequests(task), [task]);

  const requestedFieldsKey = requestedFields.join("|");

  const [view, setView] = useState<"waiting" | "received">("waiting");

  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  const [notesByLabel, setNotesByLabel] = useState<Record<string, string>>({});
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [fieldNotes, setFieldNotes] = useState<Record<string, string>>({});

  const [customEvidenceLabel, setCustomEvidenceLabel] = useState("");
  const [customEvidenceNote, setCustomEvidenceNote] = useState("");

  const [customFieldName, setCustomFieldName] = useState("");
  const [customFieldLabel, setCustomFieldLabel] = useState("");
  const [customFieldValue, setCustomFieldValue] = useState("");
  const [customFieldNote, setCustomFieldNote] = useState("");

  const submitAdditionalInformation = useDashboardStore(
    (state) => state.submitAdditionalInformation,
  );

  const reopenReviewTask = useDashboardStore((state) => state.reopenReviewTask);

  const isSubmittingAdditionalInformation = useDashboardStore(
    (state) => state.isSubmittingAdditionalInformation,
  );

  const isReopeningReviewTask = useDashboardStore(
    (state) => state.isReopeningReviewTask,
  );

  useEffect(() => {
    setSelectedLabels([]);
  }, [requestedEvidence]);

  useEffect(() => {
    setFieldValues({});
    setFieldNotes({});
  }, [requestedFieldsKey]);

  const isBusy = isSubmittingAdditionalInformation || isReopeningReviewTask;

  const fieldValueItems = buildFieldValueItems({
    fieldRequests,
    fieldValues,
    fieldNotes,
    customFieldName,
    customFieldLabel,
    customFieldValue,
    customFieldNote,
  });
  const receivedFirNumber = fieldValueItems.find((item) =>
    isFirField(item.field),
  );
  const evidenceItems = buildEvidenceItems({
    selectedLabels,
    notesByLabel,
    customEvidenceLabel,
    customEvidenceNote,
  }).map((item) =>
    receivedFirNumber && isFirReferenceEvidence(item.label)
      ? {
          ...item,
          note: attachFirReference(item.note, receivedFirNumber.value),
        }
      : item,
  );

  const requestedFieldKeys = uniqueLabels([
    ...requestedFields,
    ...fieldRequests.map((item) => item.field),
  ]);
  const unresolvedFields = requestedFieldKeys.filter(
    (field) =>
      !fieldValueItems.some(
        (item) => normalizeLabel(item.field) === normalizeLabel(field),
      ),
  );
  const unresolvedEvidence = requestedEvidence.filter(
    (label) =>
      !evidenceItems.some(
        (item) =>
          normalizeLabel(item.label) === normalizeLabel(label) &&
          Boolean(item.note?.trim()),
      ),
  );
  const hasKnownRequestedItems =
    requestedFieldKeys.length > 0 || requestedEvidence.length > 0;
  const hasAnyReceivedInformation =
    evidenceItems.length > 0 || fieldValueItems.length > 0;
  const canSubmit =
    !isBusy &&
    hasAnyReceivedInformation &&
    (!hasKnownRequestedItems ||
      (unresolvedFields.length === 0 && unresolvedEvidence.length === 0));

  const toggleEvidenceLabel = (label: string) => {
    setSelectedLabels((current) => {
      const exists = current.includes(label);

      if (exists) {
        return current.filter((item) => item !== label);
      }

      return [...current, label];
    });
  };

  const updateEvidenceNote = (label: string, note: string) => {
    setNotesByLabel((current) => ({
      ...current,
      [label]: note,
    }));
  };

  const updateFieldValue = (field: string, value: string) => {
    setFieldValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateFieldNote = (field: string, note: string) => {
    setFieldNotes((current) => ({
      ...current,
      [field]: note,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (evidenceItems.length === 0 && fieldValueItems.length === 0) {
      return;
    }

    const recorded = await submitAdditionalInformation(task.runId, {
      evidenceItems,
      fieldValues: fieldValueItems,
    });

    if (!recorded) {
      return;
    }

    await reopenReviewTask(task.id);
  };

  const requestDecision =
    task.decisions.find(
      (decision) => decision.decision === "REQUEST_MORE_INFO",
    ) ??
    task.decisions[0] ??
    null;
  const requestDate =
    requestDecision?.createdAt ?? task.completedAt ?? task.updatedAt;
  const requestedItemCount = requestedEvidence.length + fieldRequests.length;
  const unresolvedItemCount =
    unresolvedFields.length + unresolvedEvidence.length;

  return (
    <section className="mt-5 space-y-5">
      <div className="overflow-hidden rounded-2xl border border-[#dfe8e3] bg-white shadow-[0_8px_28px_rgba(18,63,59,0.045)]">
        <div className="grid sm:grid-cols-3">
          <div className="flex min-w-0 items-center gap-3 border-b border-[#dfe8e3] bg-[#eef8f5] px-4 py-4 sm:border-b-0 sm:border-r sm:px-5">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#0f766e] text-white">
              <InformationIcon name="check" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#123f3b]">
                Request recorded
              </p>
              <p className="mt-1 text-xs leading-5 text-[#667571]">
                Reviewer notes saved
              </p>
            </div>
          </div>
          <div
            className={`flex min-w-0 items-center gap-3 border-b border-[#dfe8e3] px-4 py-4 sm:border-b-0 sm:border-r sm:px-5 ${view === "waiting" ? "bg-[#dcefea]" : "bg-white"}`}
          >
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${view === "waiting" ? "bg-[#0f766e] text-white" : "border border-[#dfe8e3] bg-white text-[#667571]"}`}
            >
              <InformationIcon name="clock" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#123f3b]">Waiting</p>
              <p className="mt-1 text-xs leading-5 text-[#667571]">
                Review safely paused
              </p>
            </div>
          </div>
          <div
            className={`flex min-w-0 items-center gap-3 px-4 py-4 sm:px-5 ${view === "received" ? "bg-[#dcefea]" : "bg-white"}`}
          >
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${view === "received" ? "bg-[#0f766e] text-white" : "border border-[#dfe8e3] bg-white text-[#667571]"}`}
            >
              <InformationIcon name="inbox" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#123f3b]">
                Record &amp; reopen
              </p>
              <p className="mt-1 text-xs leading-5 text-[#667571]">
                Return to human review
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        className="flex flex-wrap gap-2"
        aria-label="Information request state"
      >
        <button
          type="button"
          aria-pressed={view === "waiting"}
          onClick={() => setView("waiting")}
          className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${view === "waiting" ? "border-[#0f766e] bg-[#0f766e] text-white" : "border-[#dfe8e3] bg-white text-[#667571] hover:border-[#b9dfd3] hover:text-[#155e57]"}`}
        >
          Waiting
        </button>
        <button
          type="button"
          aria-pressed={view === "received"}
          onClick={() => setView("received")}
          className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${view === "received" ? "border-[#0f766e] bg-[#0f766e] text-white" : "border-[#dfe8e3] bg-white text-[#667571] hover:border-[#b9dfd3] hover:text-[#155e57]"}`}
        >
          Information received
        </button>
      </div>

      {view === "waiting" ? (
        <div className="grid min-w-0 overflow-hidden rounded-2xl border border-[#dfe8e3] bg-white shadow-[0_8px_28px_rgba(18,63,59,0.045)] xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,.72fr)]">
          <div className="min-w-0 p-4 sm:p-6 lg:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-[#123f3b]">
                  Waiting for information
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667571]">
                  The review is paused. Record the response when the requested
                  information becomes available.
                </p>
              </div>
              <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-[#eef8f5] px-3 py-2 text-xs font-semibold text-[#155e57]">
                <InformationIcon name="clock" /> Awaiting response
              </span>
            </div>

            <div className="mt-6 border-t border-[#dfe8e3]">
              <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-[#123f3b]">
                    Requested items
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-[#667571]">
                    {requestedItemCount}{" "}
                    {requestedItemCount === 1 ? "item" : "items"} identified for
                    follow-up
                  </p>
                </div>
              </div>

              {fieldRequests.map((fieldRequest) => (
                <div
                  key={fieldRequest.field}
                  className="grid min-w-0 gap-3 border-t border-[#dfe8e3] py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="grid min-w-0 grid-cols-[40px_minmax(0,1fr)] items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#dcefea] text-[#155e57]">
                      <InformationIcon name="field" />
                    </span>
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-[#20302e]">
                        {fieldRequest.label ||
                          humanizeField(fieldRequest.field)}
                      </p>
                      <p className="mt-1 break-words text-xs leading-5 text-[#667571]">
                        {fieldRequest.question ?? "Missing claim information"}
                      </p>
                    </div>
                  </div>
                  <span className="ml-[52px] w-fit rounded-full bg-[#fff2df] px-2.5 py-1 text-xs font-semibold text-[#8c5b1c] sm:ml-0">
                    Missing field
                  </span>
                </div>
              ))}

              {requestedEvidence.map((label) => (
                <div
                  key={label}
                  className="grid min-w-0 gap-3 border-t border-[#dfe8e3] py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="grid min-w-0 grid-cols-[40px_minmax(0,1fr)] items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#dcefea] text-[#155e57]">
                      <InformationIcon name="file" />
                    </span>
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-[#20302e]">
                        {humanizeField(label)}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#667571]">
                        Requested supporting evidence
                      </p>
                    </div>
                  </div>
                  <span className="ml-[52px] w-fit rounded-full bg-[#fff2df] px-2.5 py-1 text-xs font-semibold text-[#8c5b1c] sm:ml-0">
                    Pending
                  </span>
                </div>
              ))}

              {requestedItemCount === 0 ? (
                <p className="border-t border-[#dfe8e3] py-5 text-sm leading-6 text-[#667571]">
                  The request did not include structured items. Use the reviewer
                  notes in the activity panel as the follow-up reference.
                </p>
              ) : null}
            </div>

            <div className="mt-5 flex flex-col-reverse gap-3 border-t border-[#dfe8e3] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-[#667571]">
                No claim data changes until received information is recorded and
                reviewed.
              </p>
              <button
                type="button"
                onClick={() => setView("received")}
                className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0f766e] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#155e57] sm:w-auto"
              >
                <InformationIcon name="inbox" /> Record received information
              </button>
            </div>
          </div>

          <aside className="min-w-0 border-t border-[#dfe8e3] bg-[#f6faf8] p-4 sm:p-6 xl:border-l xl:border-t-0">
            <h3 className="text-base font-semibold text-[#123f3b]">Activity</h3>
            <div className="mt-5 space-y-5">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#dcefea] text-[#155e57]">
                  <InformationIcon name="history" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#20302e]">
                    Information requested
                  </p>
                  <p className="mt-1 break-words text-xs leading-5 text-[#667571]">
                    {formatRequestDate(requestDate)}
                  </p>
                </div>
              </div>
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#dcefea] text-[#155e57]">
                  <InformationIcon name="check" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#20302e]">
                    Recorded by reviewer
                  </p>
                  <p className="mt-1 break-words text-xs leading-5 text-[#667571]">
                    {reviewerDisplayName(
                      requestDecision?.reviewerName ?? task.assignedTo,
                    )}
                  </p>
                </div>
              </div>
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#dfe8e3] bg-white text-[#667571]">
                  <InformationIcon name="clock" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#20302e]">
                    Response pending
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#667571]">
                    No additional information recorded yet
                  </p>
                </div>
              </div>
            </div>

            {requestDecision?.notes ? (
              <div className="mt-6 border-t border-[#dfe8e3] pt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#667571]">
                  Reviewer notes
                </p>
                <p className="mt-2 break-words text-sm leading-6 text-[#344441]">
                  {requestDecision.notes}
                </p>
              </div>
            ) : null}

            <div className="mt-6 border-t border-[#dfe8e3] pt-5">
              <p className="flex items-start gap-2 text-xs leading-5 text-[#4e6b66]">
                <InformationIcon
                  name="shield"
                  className="mt-0.5 h-[17px] w-[17px] shrink-0 text-[#0f766e]"
                />
                <span>
                  The original claim details and recommendation remain unchanged
                  while this review is paused.
                </span>
              </p>
            </div>
          </aside>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="grid min-w-0 overflow-hidden rounded-2xl border border-[#dfe8e3] bg-white shadow-[0_8px_28px_rgba(18,63,59,0.045)] xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,.72fr)]"
        >
          <div className="min-w-0 p-4 sm:p-6 lg:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-[#123f3b]">
                  Record received information
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667571]">
                  Enter only the information and evidence that was actually
                  received. The claim will return to human review after it is
                  recorded.
                </p>
              </div>
              <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-[#eef8f5] px-3 py-2 text-xs font-semibold text-[#155e57]">
                <InformationIcon name="shield" /> Audited
              </span>
            </div>

            {fieldRequests.length > 0 ? (
              <section className="mt-6 border-t border-[#dfe8e3] pt-5">
                <h3 className="text-base font-semibold text-[#123f3b]">
                  Missing information
                </h3>
                <p className="mt-1 text-sm leading-6 text-[#667571]">
                  Enter the values included in the response.
                </p>
                <div className="mt-4 space-y-5">
                  {fieldRequests.map((fieldRequest) => (
                    <div
                      key={fieldRequest.field}
                      className="min-w-0 border-t border-[#dfe8e3] pt-4 first:border-t-0 first:pt-0"
                    >
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold text-[#20302e]">
                          {fieldRequest.label ||
                            humanizeField(fieldRequest.field)}
                        </p>
                        {fieldRequest.question ? (
                          <p className="mt-1 break-words text-xs leading-5 text-[#667571]">
                            {fieldRequest.question}
                          </p>
                        ) : null}
                        {fieldRequest.acceptedEvidence?.length ? (
                          <p className="mt-1 break-words text-xs leading-5 text-[#667571]">
                            Accepted supporting evidence:{" "}
                            {fieldRequest.acceptedEvidence.join(", ")}
                          </p>
                        ) : null}
                      </div>
                      <div className="mt-3 grid min-w-0 gap-4 md:grid-cols-2">
                        <label className="block min-w-0 text-sm font-semibold text-[#344441]">
                          <span>Received value</span>
                          <input
                            value={fieldValues[fieldRequest.field] ?? ""}
                            onChange={(event) =>
                              updateFieldValue(
                                fieldRequest.field,
                                event.target.value,
                              )
                            }
                            placeholder="Enter received value"
                            className="mt-2 w-full min-w-0 rounded-xl border border-[#dfe8e3] bg-white px-3 py-2.5 text-sm font-normal outline-none placeholder:text-[#87928f] focus:border-[#0f766e] focus:ring-4 focus:ring-[#dcefea]"
                          />
                        </label>
                        <label className="block min-w-0 text-sm font-semibold text-[#344441]">
                          <span>Note</span>
                          <input
                            value={fieldNotes[fieldRequest.field] ?? ""}
                            onChange={(event) =>
                              updateFieldNote(
                                fieldRequest.field,
                                event.target.value,
                              )
                            }
                            placeholder="Optional context"
                            className="mt-2 w-full min-w-0 rounded-xl border border-[#dfe8e3] bg-white px-3 py-2.5 text-sm font-normal outline-none placeholder:text-[#87928f] focus:border-[#0f766e] focus:ring-4 focus:ring-[#dcefea]"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {requestedEvidence.length > 0 ? (
              <section className="mt-6 border-t border-[#dfe8e3] pt-5">
                <h3 className="text-base font-semibold text-[#123f3b]">
                  Evidence received
                </h3>
                <p className="mt-1 text-sm leading-6 text-[#667571]">
                  Select only the requested evidence that was received.
                </p>
                <div className="mt-4 divide-y divide-[#dfe8e3] border-t border-[#dfe8e3]">
                  {requestedEvidence.map((label) => {
                    const checked = selectedLabels.includes(label);

                    return (
                      <div key={label} className="min-w-0 py-4">
                        <label className="flex min-w-0 items-start gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleEvidenceLabel(label)}
                            className="mt-1 h-4 w-4 shrink-0 accent-[#0f766e]"
                          />
                          <span className="min-w-0 flex-1 break-words text-sm font-semibold text-[#20302e]">
                            {humanizeField(label)}
                          </span>
                        </label>
                        {checked ? (
                          <label className="ml-7 mt-3 block min-w-0 text-sm font-semibold text-[#344441]">
                            {isFirReferenceEvidence(label) &&
                            receivedFirNumber ? (
                              <span className="mb-3 flex min-w-0 flex-col gap-1 rounded-xl border border-[#b9dfd3] bg-[#eef8f5] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                <span className="text-xs font-semibold text-[#4e6b66]">
                                  FIR number linked from the response
                                </span>
                                <strong className="break-words text-sm text-[#123f3b]">
                                  {receivedFirNumber.value}
                                </strong>
                              </span>
                            ) : null}
                            <span>
                              {isFirReferenceEvidence(label) &&
                              receivedFirNumber
                                ? "Additional evidence note"
                                : "Evidence note"}{" "}
                              {!isFirReferenceEvidence(label) ||
                              !receivedFirNumber ? (
                                <span className="text-red-600">*</span>
                              ) : null}
                            </span>
                            <textarea
                              rows={3}
                              value={notesByLabel[label] ?? ""}
                              onChange={(event) =>
                                updateEvidenceNote(label, event.target.value)
                              }
                              placeholder={
                                isFirReferenceEvidence(label) &&
                                receivedFirNumber
                                  ? "Add optional context about the received document"
                                  : "Describe the evidence that was received"
                              }
                              className="mt-2 w-full min-w-0 resize-y rounded-xl border border-[#dfe8e3] bg-white px-3 py-2.5 text-sm font-normal leading-6 outline-none placeholder:text-[#87928f] focus:border-[#0f766e] focus:ring-4 focus:ring-[#dcefea]"
                            />
                            <span className="mt-2 block text-xs font-normal leading-5 text-[#667571]">
                              {isFirReferenceEvidence(label) &&
                              receivedFirNumber
                                ? `The FIR number ${receivedFirNumber.value} is linked automatically and will be prefilled for the reviewer.`
                                : "Required so the received evidence can be verified before reopening."}
                            </span>
                          </label>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <details className="mt-6 border-t border-[#dfe8e3] pt-5">
              <summary className="cursor-pointer text-sm font-semibold text-[#155e57]">
                Add another field or evidence item
              </summary>
              <div className="mt-5 space-y-6">
                <section>
                  <h3 className="text-sm font-semibold text-[#123f3b]">
                    Additional field value
                  </h3>
                  <div className="mt-3 grid min-w-0 gap-4 md:grid-cols-2">
                    <label className="block min-w-0 text-sm font-semibold text-[#344441]">
                      <span>Field key</span>
                      <input
                        value={customFieldName}
                        onChange={(event) =>
                          setCustomFieldName(event.target.value)
                        }
                        placeholder="Example: policyNumber"
                        className="mt-2 w-full min-w-0 rounded-xl border border-[#dfe8e3] bg-white px-3 py-2.5 text-sm font-normal outline-none placeholder:text-[#87928f] focus:border-[#0f766e] focus:ring-4 focus:ring-[#dcefea]"
                      />
                    </label>
                    <label className="block min-w-0 text-sm font-semibold text-[#344441]">
                      <span>Field label</span>
                      <input
                        value={customFieldLabel}
                        onChange={(event) =>
                          setCustomFieldLabel(event.target.value)
                        }
                        placeholder="Example: Policy number"
                        className="mt-2 w-full min-w-0 rounded-xl border border-[#dfe8e3] bg-white px-3 py-2.5 text-sm font-normal outline-none placeholder:text-[#87928f] focus:border-[#0f766e] focus:ring-4 focus:ring-[#dcefea]"
                      />
                    </label>
                    <label className="block min-w-0 text-sm font-semibold text-[#344441]">
                      <span>Received value</span>
                      <input
                        value={customFieldValue}
                        onChange={(event) =>
                          setCustomFieldValue(event.target.value)
                        }
                        placeholder="Enter received value"
                        className="mt-2 w-full min-w-0 rounded-xl border border-[#dfe8e3] bg-white px-3 py-2.5 text-sm font-normal outline-none placeholder:text-[#87928f] focus:border-[#0f766e] focus:ring-4 focus:ring-[#dcefea]"
                      />
                    </label>
                    <label className="block min-w-0 text-sm font-semibold text-[#344441]">
                      <span>Note</span>
                      <input
                        value={customFieldNote}
                        onChange={(event) =>
                          setCustomFieldNote(event.target.value)
                        }
                        placeholder="Optional context"
                        className="mt-2 w-full min-w-0 rounded-xl border border-[#dfe8e3] bg-white px-3 py-2.5 text-sm font-normal outline-none placeholder:text-[#87928f] focus:border-[#0f766e] focus:ring-4 focus:ring-[#dcefea]"
                      />
                    </label>
                  </div>
                </section>
                <section className="border-t border-[#dfe8e3] pt-5">
                  <h3 className="text-sm font-semibold text-[#123f3b]">
                    Additional evidence
                  </h3>
                  <div className="mt-3 grid min-w-0 gap-4 md:grid-cols-2">
                    <label className="block min-w-0 text-sm font-semibold text-[#344441]">
                      <span>Evidence label</span>
                      <input
                        value={customEvidenceLabel}
                        onChange={(event) =>
                          setCustomEvidenceLabel(event.target.value)
                        }
                        placeholder="Describe the evidence"
                        className="mt-2 w-full min-w-0 rounded-xl border border-[#dfe8e3] bg-white px-3 py-2.5 text-sm font-normal outline-none placeholder:text-[#87928f] focus:border-[#0f766e] focus:ring-4 focus:ring-[#dcefea]"
                      />
                    </label>
                    <label className="block min-w-0 text-sm font-semibold text-[#344441]">
                      <span>Note</span>
                      <input
                        value={customEvidenceNote}
                        onChange={(event) =>
                          setCustomEvidenceNote(event.target.value)
                        }
                        placeholder="Optional context"
                        className="mt-2 w-full min-w-0 rounded-xl border border-[#dfe8e3] bg-white px-3 py-2.5 text-sm font-normal outline-none placeholder:text-[#87928f] focus:border-[#0f766e] focus:ring-4 focus:ring-[#dcefea]"
                      />
                    </label>
                  </div>
                </section>
              </div>
            </details>

            {fieldRequests.length === 0 && requestedEvidence.length === 0 ? (
              <p className="mt-6 rounded-xl border border-[#dfe8e3] bg-[#f6faf8] px-4 py-3 text-sm leading-6 text-[#667571]">
                No structured request items were found. Open “Add another field
                or evidence item” to record the response.
              </p>
            ) : null}

            <p className="mt-6 flex items-start gap-2 rounded-xl border border-[#b9dfd3] bg-[#eef8f5] px-4 py-3 text-xs leading-5 text-[#4e6b66]">
              <InformationIcon
                name="shield"
                className="mt-0.5 h-[17px] w-[17px] shrink-0 text-[#0f766e]"
              />
              <span>
                Received information is stored in the audit trail. Final claim
                corrections still require human verification.
              </span>
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#dfe8e3] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setView("waiting")}
                disabled={isBusy}
                className="inline-flex w-full items-center justify-center rounded-xl border border-[#b9dfd3] bg-white px-4 py-3 text-sm font-semibold text-[#155e57] transition hover:bg-[#eef8f5] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f766e] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#155e57] disabled:cursor-not-allowed disabled:bg-[#9bb8b1] sm:w-auto"
              >
                <InformationIcon name="history" />
                {isBusy ? "Recording and reopening…" : "Record & reopen review"}
              </button>
            </div>
          </div>

          <aside className="min-w-0 border-t border-[#dfe8e3] bg-[#f6faf8] p-4 sm:p-6 xl:border-l xl:border-t-0">
            <h3 className="text-base font-semibold text-[#123f3b]">
              Response summary
            </h3>
            <dl className="mt-5 space-y-4">
              <div className="flex min-w-0 flex-col gap-1 border-b border-[#dfe8e3] pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 xl:flex-col xl:gap-1 2xl:flex-row 2xl:gap-4">
                <dt className="text-sm text-[#667571]">Fields entered</dt>
                <dd className="break-words text-sm font-semibold text-[#20302e]">
                  {fieldValueItems.length}
                </dd>
              </div>
              <div className="flex min-w-0 flex-col gap-1 border-b border-[#dfe8e3] pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 xl:flex-col xl:gap-1 2xl:flex-row 2xl:gap-4">
                <dt className="text-sm text-[#667571]">Evidence received</dt>
                <dd className="break-words text-sm font-semibold text-[#20302e]">
                  {evidenceItems.length}
                </dd>
              </div>
              <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4 xl:flex-col xl:gap-1 2xl:flex-row 2xl:gap-4">
                <dt className="text-sm text-[#667571]">Next state</dt>
                <dd className="break-words text-sm font-semibold text-[#20302e] sm:text-right xl:text-left 2xl:text-right">
                  Ready for review
                </dd>
              </div>
            </dl>

            <div className="mt-6 border-t border-[#dfe8e3] pt-5">
              <h3 className="text-sm font-semibold text-[#123f3b]">
                What will happen
              </h3>
              <ol className="mt-4 space-y-4">
                <li className="flex min-w-0 items-start gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#dcefea] text-xs font-semibold text-[#155e57]">
                    1
                  </span>
                  <span className="min-w-0 break-words text-sm leading-6 text-[#667571]">
                    Record the received items in the audit trail.
                  </span>
                </li>
                <li className="flex min-w-0 items-start gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#dcefea] text-xs font-semibold text-[#155e57]">
                    2
                  </span>
                  <span className="min-w-0 break-words text-sm leading-6 text-[#667571]">
                    Reopen the task to ready for review.
                  </span>
                </li>
                <li className="flex min-w-0 items-start gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#dcefea] text-xs font-semibold text-[#155e57]">
                    3
                  </span>
                  <span className="min-w-0 break-words text-sm leading-6 text-[#667571]">
                    A human reviewer verifies the final corrections.
                  </span>
                </li>
              </ol>
            </div>

            {!canSubmit ? (
              <p className="mt-6 rounded-xl bg-white px-4 py-3 text-xs leading-5 text-[#667571]">
                {hasKnownRequestedItems && unresolvedItemCount > 0
                  ? `${unresolvedItemCount} requested ${unresolvedItemCount === 1 ? "item remains" : "items remain"}. Record every requested item before reopening the review.`
                  : "Enter at least one field value or select one received evidence item to continue."}
              </p>
            ) : null}
          </aside>
        </form>
      )}
    </section>
  );
}

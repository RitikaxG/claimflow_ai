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
    value.label ?? value.evidenceType ?? value.type ?? value.name ?? value.field;

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
    (item): item is string => typeof item === "string" && item.trim().length > 0,
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

export function AdditionalInformationPanel({
  task,
}: AdditionalInformationPanelProps) {
  const requestedEvidence = useMemo(() => getRequestedEvidence(task), [task]);
  const requestedFields = useMemo(() => getRequestedFields(task), [task]);
  const fieldRequests = useMemo(() => getFieldRequests(task), [task]);

  const requestedFieldsKey = requestedFields.join("|");

  const [selectedLabels, setSelectedLabels] =
    useState<string[]>(requestedEvidence);

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
    setSelectedLabels(requestedEvidence);
  }, [requestedEvidence]);

  useEffect(() => {
    setFieldValues({});
    setFieldNotes({});
  }, [requestedFieldsKey]);

  const isBusy = isSubmittingAdditionalInformation || isReopeningReviewTask;

  const evidenceItems = buildEvidenceItems({
    selectedLabels,
    notesByLabel,
    customEvidenceLabel,
    customEvidenceNote,
  });

  const fieldValueItems = buildFieldValueItems({
    fieldRequests,
    fieldValues,
    fieldNotes,
    customFieldName,
    customFieldLabel,
    customFieldValue,
    customFieldNote,
  });

  const canSubmit =
    (evidenceItems.length > 0 || fieldValueItems.length > 0) && !isBusy;

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

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-gray-950">
          Requested information received?
        </h2>

        <p className="text-sm text-amber-800">
          This review is paused because the agent requested missing information
          or evidence. Record what was received, reopen the review to PENDING,
          then start review again for final human verification.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        <div className="rounded-xl bg-white p-4">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Missing information
            </p>

            <p className="text-sm text-gray-600">
              Enter received field values. These values are recorded as audit
              metadata. The reviewer still updates the final corrected JSON in
              the review workspace.
            </p>
          </div>

          {fieldRequests.length > 0 ? (
            <div className="mt-4 space-y-3">
              {fieldRequests.map((fieldRequest) => (
                <div
                  key={fieldRequest.field}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-950">
                      {fieldRequest.label}
                    </p>

                    <p className="mt-1 font-mono text-xs text-gray-500">
                      {fieldRequest.field}
                    </p>

                    {fieldRequest.question ? (
                      <p className="mt-2 text-sm text-gray-600">
                        {fieldRequest.question}
                      </p>
                    ) : null}

                    {fieldRequest.acceptedEvidence &&
                    fieldRequest.acceptedEvidence.length > 0 ? (
                      <p className="mt-2 text-xs text-gray-500">
                        Accepted supporting document(s):{" "}
                        {fieldRequest.acceptedEvidence.join(", ")}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">
                        Received value
                      </span>

                      <input
                        value={fieldValues[fieldRequest.field] ?? ""}
                        onChange={(event) =>
                          updateFieldValue(fieldRequest.field, event.target.value)
                        }
                        placeholder="Enter received value..."
                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-950 placeholder:text-gray-400 outline-none focus:border-gray-400"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">
                        Note
                      </span>

                      <input
                        value={fieldNotes[fieldRequest.field] ?? ""}
                        onChange={(event) =>
                          updateFieldNote(fieldRequest.field, event.target.value)
                        }
                        placeholder="Optional note..."
                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-950 placeholder:text-gray-400 outline-none focus:border-gray-400"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
              No structured missing fields were found. Add a custom field below
              if the claimant provided information.
            </p>
          )}
        </div>

        <div className="rounded-xl bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Add custom field value
          </p>

          <p className="mt-1 text-sm text-gray-600">
            Use this when the claimant provided a field that was not listed in
            the draft.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Field key
              </span>

              <input
                value={customFieldName}
                onChange={(event) => setCustomFieldName(event.target.value)}
                placeholder="Example: policyNumber"
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-950 placeholder:text-gray-400 outline-none focus:border-gray-400"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Field label
              </span>

              <input
                value={customFieldLabel}
                onChange={(event) => setCustomFieldLabel(event.target.value)}
                placeholder="Example: Policy number"
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-950 placeholder:text-gray-400 outline-none focus:border-gray-400"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Received value
              </span>

              <input
                value={customFieldValue}
                onChange={(event) => setCustomFieldValue(event.target.value)}
                placeholder="Example: POL-12345"
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-950 placeholder:text-gray-400 outline-none focus:border-gray-400"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Note</span>

              <input
                value={customFieldNote}
                onChange={(event) => setCustomFieldNote(event.target.value)}
                placeholder="Optional note..."
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-950 placeholder:text-gray-400 outline-none focus:border-gray-400"
              />
            </label>
          </div>
        </div>

        <div className="rounded-xl bg-white p-4">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Requested evidence
            </p>

            <p className="text-sm text-gray-600">
              Select received evidence items and add optional notes.
            </p>
          </div>

          {requestedEvidence.length > 0 ? (
            <div className="mt-4 space-y-3">
              {requestedEvidence.map((label) => {
                const checked = selectedLabels.includes(label);

                return (
                  <div
                    key={label}
                    className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                  >
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEvidenceLabel(label)}
                        className="mt-1 h-4 w-4 rounded border-gray-300"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-medium text-gray-950">
                          {label}
                        </p>

                        <textarea
                          value={notesByLabel[label] ?? ""}
                          onChange={(event) =>
                            updateEvidenceNote(label, event.target.value)
                          }
                          disabled={!checked}
                          placeholder="Optional note for this evidence item..."
                          className="mt-2 min-h-20 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-950 placeholder:text-gray-400 outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                        />
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
              No structured requested evidence was found. Add a custom evidence
              item below if needed.
            </p>
          )}
        </div>

        <div className="rounded-xl bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Add custom evidence item
          </p>

          <p className="mt-1 text-sm text-gray-600">
            Use this when the claimant provided evidence that was not listed in
            the draft.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Evidence label
              </span>

              <input
                value={customEvidenceLabel}
                onChange={(event) => setCustomEvidenceLabel(event.target.value)}
                placeholder="Example: policySchedule"
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-950 placeholder:text-gray-400 outline-none focus:border-gray-400"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Note</span>

              <input
                value={customEvidenceNote}
                onChange={(event) => setCustomEvidenceNote(event.target.value)}
                placeholder="Optional note..."
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-950 placeholder:text-gray-400 outline-none focus:border-gray-400"
              />
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-950">
            Information to record
          </p>

          {fieldValueItems.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Field values
              </p>

              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                {fieldValueItems.map((item) => (
                  <li key={item.field}>
                    <span className="font-medium">
                      {item.label ?? item.field}
                    </span>
                    {`: ${item.value}`}
                    {item.note ? ` — ${item.note}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {evidenceItems.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Evidence
              </p>

              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                {evidenceItems.map((item) => (
                  <li key={item.label}>
                    <span className="font-medium">{item.label}</span>
                    {item.note ? ` — ${item.note}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {fieldValueItems.length === 0 && evidenceItems.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">
              Enter at least one field value, select one requested evidence
              item, or add a custom item.
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg bg-gray-950 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {isBusy
            ? "Recording information and reopening..."
            : "Record information and reopen to PENDING"}
        </button>
      </form>

      <p className="mt-3 text-xs text-amber-800">
        Recording received information does not automatically edit the extracted
        JSON. After reopening to PENDING, start the review again. If field values
        changed, use Edit & approve to update the corrected JSON.
      </p>
    </section>
  );
}
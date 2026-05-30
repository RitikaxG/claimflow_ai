"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
    useDashboardStore,
    type ReviewTaskRecord,
} from "../../store/use-dashboard-store";

type AdditionalEvidencePanelProps = {
    task : ReviewTaskRecord,
};

type EvidenceItemInput = {
    label : string,
    note? : string,
};

function isRecord(value : unknown): value is Record<string,unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeLabel(value : string) {
    return value.trim().toLowerCase().replace(/\s+/g," ");
}

function uniqueLabels(values : string[]) {
    const seen = new Set<string>();
    const result : string[] = [];

    values.forEach((value) => {
        const trimmed = value.trim();

        if(!trimmed){
            return;
        }

        const key = normalizeLabel(trimmed);

        if(seen.has(key)){
            return;
        }

        seen.add(key);
        result.push(trimmed);
    });

    return result;
}

function getLabelFromUnknown(value : unknown): string | null {
    if(typeof value === "string"){
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }

    if(!isRecord(value)){
        return null;
    }

    const candidate =
        value.label ??
        value.evidenceType ??
        value.type ??
        value.name ??
        value.field;

    if(typeof candidate !== "string"){
        return null;
    }

    const trimmed = candidate.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function getLabelsFromUnknown(value : unknown): string[] {
    if(Array.isArray(value)){
        return uniqueLabels(
            value
                .map(getLabelFromUnknown)
                .filter((item) : item is string => item !== null),
        );
    }

    if(!isRecord(value)){
        return [];
    }

    const keysToTry = [
        "evidenceItems",
        "requestedEvidence",
        "missingEvidence",
        "requiredEvidence",
    ];

    for(const key of keysToTry){
        const labels = getLabelsFromUnknown(value[key]);

        if(labels.length > 0){
            return labels;
        }
    }

    const directLabel = getLabelFromUnknown(value);
    return directLabel ? [directLabel] : [];
}

function getRequestedEvidence(task : ReviewTaskRecord): string[] {
    const latestDraft = task.run.followupDrafts?.[0] ?? null;

    const fromDraft = latestDraft
        ? getLabelsFromUnknown(latestDraft.requestedEvidence)
        : [];

    if(fromDraft.length > 0){
        return fromDraft;
    }

    const fromReason = getLabelsFromUnknown(task.reasonJson);

    if(fromReason.length > 0){
        return fromReason;
    }

    return getLabelsFromUnknown(task.run.validationJson);
}

function buildEvidenceItems(input : {
    selectedLabels : string[],
    notesByLabel : Record<string,string>,
    customLabel : string,
    customNote : string,
}) : EvidenceItemInput[] {
    const selectedItems = input.selectedLabels.map((label) => {
        const note = input.notesByLabel[label]?.trim() ?? "";

        if(note){
            return {
                label,
                note,
            };
        }

        return {
            label,
        };
    });

    const customLabel = input.customLabel.trim();
    const customNote = input.customNote.trim();

    const customItem : EvidenceItemInput[] = customLabel
        ? [
            customNote
                ? {
                    label : customLabel,
                    note : customNote,
                }
                : {
                    label : customLabel,
                },
        ]
        : [];

    const allItems = [...selectedItems,...customItem];

    const seen = new Set<string>();

    return allItems.filter((item) => {
        const key = normalizeLabel(item.label);

        if(seen.has(key)){
            return false;
        }

        seen.add(key);
        return true;
    });
}

export function AdditionalEvidencePanel({ task } : AdditionalEvidencePanelProps) {
    const requestedEvidence = useMemo(() => getRequestedEvidence(task), [task]);
    const requestedEvidenceKey = requestedEvidence.join("|");

    const [selectedLabels,setSelectedLabels] = useState<string[]>(requestedEvidence);
    const [notesByLabel,setNotesByLabel] = useState<Record<string,string>>({});
    const [customLabel,setCustomLabel] = useState("");
    const [customNote,setCustomNote] = useState("");

    const submitAdditionalEvidence = useDashboardStore(
        (state) => state.submitAdditionalEvidence,
    );

    const reopenReviewTask = useDashboardStore(
        (state) => state.reopenReviewTask,
    );

    const isSubmittingAdditionalEvidence = useDashboardStore(
        (state) => state.isSubmittingAdditionalInformation,
    );

    const isReopeningReviewTask = useDashboardStore(
        (state) => state.isReopeningReviewTask,
    );

    useEffect(() => {
        setSelectedLabels(requestedEvidence);
    }, [requestedEvidenceKey]);

    const isBusy = isSubmittingAdditionalEvidence || isReopeningReviewTask;

    const evidenceItems = buildEvidenceItems({
        selectedLabels,
        notesByLabel,
        customLabel,
        customNote,
    });

    const canSubmit = evidenceItems.length > 0 && !isBusy;

    const toggleEvidenceLabel = (label : string) => {
        setSelectedLabels((current) => {
            const exists = current.includes(label);

            if(exists){
                return current.filter((item) => item !== label);
            }

            return [...current,label];
        });
    };

    const updateNote = (label : string, note : string) => {
        setNotesByLabel((current) => ({
            ...current,
            [label] : note,
        }));
    };

    const handleSubmit = async(event : FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if(evidenceItems.length === 0){
            return;
        }

        await submitAdditionalEvidence(task.runId, {
            evidenceItems,
        });

        await reopenReviewTask(task.id);
    };

    return (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-gray-950">
                    Requested evidence received?
                </h2>

                <p className="text-sm text-amber-800">
                    This review is paused because the agent requested more evidence.
                    Mark the received evidence items, add optional notes, then reopen
                    the review.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
                <div className="rounded-xl bg-white p-4">
                    <div className="flex flex-col gap-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Requested evidence
                        </p>

                        <p className="text-sm text-gray-600">
                            These items are dynamic and come from the follow-up draft or
                            validation reason.
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
                                                        updateNote(label,event.target.value)
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
                            No structured requested evidence was found. Add a custom
                            evidence item below.
                        </p>
                    )}
                </div>

                <div className="rounded-xl bg-white p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Add custom evidence item
                    </p>

                    <p className="mt-1 text-sm text-gray-600">
                        Use this when the claimant provided evidence that was not listed
                        in the draft.
                    </p>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <label className="block">
                            <span className="text-sm font-medium text-gray-700">
                                Evidence label
                            </span>

                            <input
                                value={customLabel}
                                onChange={(event) => setCustomLabel(event.target.value)}
                                placeholder="Example: repairEstimate"
                                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-950 placeholder:text-gray-400 outline-none focus:border-gray-400"
                            />
                        </label>

                        <label className="block">
                            <span className="text-sm font-medium text-gray-700">
                                Note
                            </span>

                            <input
                                value={customNote}
                                onChange={(event) => setCustomNote(event.target.value)}
                                placeholder="Optional note..."
                                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-950 placeholder:text-gray-400 outline-none focus:border-gray-400"
                            />
                        </label>
                    </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-white p-4">
                    <p className="text-sm font-medium text-gray-950">
                        Evidence to record
                    </p>

                    {evidenceItems.length > 0 ? (
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                            {evidenceItems.map((item) => (
                                <li key={item.label}>
                                    <span className="font-medium">{item.label}</span>
                                    {item.note ? ` — ${item.note}` : ""}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mt-2 text-sm text-gray-500">
                            Select at least one requested evidence item or add a custom
                            item.
                        </p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={!canSubmit}
                    className="rounded-lg bg-gray-950 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                    {isBusy
                        ? "Recording evidence..."
                        : "Record evidence and reopen review"}
                </button>
            </form>

            <p className="mt-3 text-xs text-amber-800">
                MVP note: this records received evidence metadata. Full file upload can
                be wired after the evidence loop works end-to-end.
            </p>
        </section>
    );
}
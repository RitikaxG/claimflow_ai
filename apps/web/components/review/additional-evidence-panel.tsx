"use client";

import { FormEvent, useMemo, useState } from "react";
import {
    useDashboardStore,
    type ReviewTaskRecord,
} from "../../store/use-dashboard-store";

type AdditionalEvidencePanelProps = {
    task : ReviewTaskRecord,
};

function isRecord(value : unknown): value is Record<string,unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringArray(value : unknown): string[] {
    return Array.isArray(value)
        ? value.filter((item) => typeof item === "string")
        : [];
}

function getReasonRequiredEvidence(reasonJson : unknown): string[] {
    if(!isRecord(reasonJson)){
        return [];
    }

    return getStringArray(reasonJson.requiredEvidence);
}

function getDraftRequestedEvidence(task : ReviewTaskRecord): string[] {
    const latestDraft = task.run.followupDrafts?.[0];

    if(!latestDraft){
        return [];
    }

    const requestedEvidence = latestDraft.requestedEvidence;

    if(Array.isArray(requestedEvidence)){
        return getStringArray(requestedEvidence);
    }

    if(isRecord(requestedEvidence)){
        const direct = getStringArray(requestedEvidence.requestedEvidence);
        if(direct.length > 0){
            return direct;
        }

        const missingEvidence = getStringArray(requestedEvidence.missingEvidence);
        if(missingEvidence.length > 0){
            return missingEvidence;
        }
    }

    return [];
}

function getRequestedEvidence(task : ReviewTaskRecord): string[] {
    const fromDraft = getDraftRequestedEvidence(task);

    if(fromDraft.length > 0){
        return fromDraft;
    }

    return getReasonRequiredEvidence(task.reasonJson);
}

function toEvidenceType(value : string) {
    const normalized = value.trim().toLowerCase();

    if(normalized.includes("fir")){
        return "FIR";
    }

    if(normalized.includes("police")){
        return "POLICE_REPORT";
    }

    if(normalized.includes("invoice")){
        return "INVOICE";
    }

    return value.trim().toUpperCase().replaceAll(" ","_");
}

export function AdditionalEvidencePanel({ task } : AdditionalEvidencePanelProps) {
    const requestedEvidence = useMemo(() => getRequestedEvidence(task), [task]);

    const defaultEvidenceType =
        requestedEvidence.length > 0
            ? toEvidenceType(requestedEvidence[0] ?? "")
            : "FIR";

    const [evidenceType,setEvidenceType] = useState(defaultEvidenceType);
    const [note,setNote] = useState("");

    const submitAdditionalEvidence = useDashboardStore(
        (state) => state.submitAdditionalEvidence,
    );
    const reopenReviewTask = useDashboardStore(
        (state) => state.reopenReviewTask,
    );
    const isSubmittingAdditionalEvidence = useDashboardStore(
        (state) => state.isSubmittingAdditionalEvidence,
    );
    const isReopeningReviewTask = useDashboardStore(
        (state) => state.isReopeningReviewTask,
    );

    const isBusy = isSubmittingAdditionalEvidence || isReopeningReviewTask;

    const handleSubmit = async(event : FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        await submitAdditionalEvidence(task.runId, {
            evidenceType,
            note,
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
                    Record the received evidence, then reopen the review.
                </p>
            </div>

            {requestedEvidence.length > 0 ? (
                <div className="mt-4 rounded-xl bg-white p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Requested by follow-up draft
                    </p>

                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                        {requestedEvidence.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <label className="block">
                    <span className="text-sm font-medium text-gray-700">
                        Evidence type
                    </span>

                    <select
                        value={evidenceType}
                        onChange={(event) => setEvidenceType(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-950 outline-none focus:border-amber-400"
                    >
                        <option value="FIR">FIR</option>
                        <option value="POLICE_REPORT">Police report</option>
                        <option value="INVOICE">Invoice</option>
                        <option value="PHOTO_EVIDENCE">Photo evidence</option>
                        <option value="OTHER">Other</option>
                    </select>
                </label>

                <label className="block">
                    <span className="text-sm font-medium text-gray-700">
                        Note
                    </span>

                    <textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder="Example: FIR uploaded by claimant."
                        className="mt-1 min-h-24 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-950 placeholder:text-gray-400 outline-none focus:border-amber-400"
                    />
                </label>

                <button
                    type="submit"
                    disabled={isBusy}
                    className="rounded-lg bg-gray-950 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                    {isBusy
                        ? "Recording evidence..."
                        : "Record evidence and reopen review"}
                </button>
            </form>

            <p className="mt-3 text-xs text-amber-800">
                MVP note: this records received evidence metadata. Full document upload
                and OCR matching can be added after this loop works end-to-end.
            </p>
        </section>
    );
}
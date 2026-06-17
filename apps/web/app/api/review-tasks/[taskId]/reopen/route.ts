import { prisma } from "@repo/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
    params : Promise<{
        taskId : string;
    }>;
};

type ReceivedEventType =
    | "ADDITIONAL_EVIDENCE_RECEIVED"
    | "ADDITIONAL_INFORMATION_RECEIVED";

type ReopenEventView = {
    type : ReceivedEventType;
    createdAt : Date;
    metadata : unknown;
};

type RequestedItems = {
    requestedFields : string[];
    requestedEvidence : string[];
};

function isRecord(value : unknown): value is Record<string,unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
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
        value.label ?? value.evidenceType ?? value.type ?? value.name ?? value.field;

    if(typeof candidate !== "string"){
        return null;
    }

    const trimmed = candidate.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function getFieldFromUnknown(value : unknown): string | null {
    if(typeof value === "string"){
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }

    if(!isRecord(value)){
        return null;
    }

    const candidate = value.field ?? value.name ?? value.key;

    if(typeof candidate !== "string"){
        return null;
    }

    const trimmed = candidate.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function uniqueValues(values : string[]): string[] {
    const seen = new Set<string>();
    const result : string[] = [];

    values.forEach((value) => {
        const trimmed = value.trim();

        if(!trimmed){
            return;
        }

        const key = trimmed.toLowerCase();

        if(seen.has(key)){
            return;
        }

        seen.add(key);
        result.push(trimmed);
    });

    return result;
}

function getLabelsFromUnknown(value : unknown): string[] {
    if(Array.isArray(value)){
        return uniqueValues(
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

function getFieldsFromUnknown(value : unknown): string[] {
    if(Array.isArray(value)){
        return uniqueValues(
            value
                .map(getFieldFromUnknown)
                .filter((item) : item is string => item !== null),
        );
    }

    if(!isRecord(value)){
        return [];
    }

    const keysToTry = [
        "fieldValues",
        "requestedFields",
        "missingFields",
        "fieldRequests",
    ];

    for(const key of keysToTry){
        const fields = getFieldsFromUnknown(value[key]);

        if(fields.length > 0){
            return fields;
        }
    }

    const directField = getFieldFromUnknown(value);
    return directField ? [directField] : [];
}

function getDetailedEvidenceLabels(value : unknown): string[] {
    if(!Array.isArray(value)){
        return [];
    }

    return uniqueValues(
        value
            .map((item) => {
                if(!isRecord(item)){
                    return null;
                }

                const note = typeof item.note === "string" ? item.note.trim() : "";

                if(!note){
                    return null;
                }

                return getLabelFromUnknown(item);
            })
            .filter((item) : item is string => item !== null),
    );
}

function normalizeFieldKey(value : string): string {
    return value
        .replace(/([a-z0-9])([A-Z])/g,"$1_$2")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g,"");
}

function normalizeEvidenceKey(value : string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g,"");
}

function getMissingItems(
    requested : string[],
    received : string[],
    normalize : (value : string) => string,
): string[] {
    const receivedKeys = new Set(
        received
            .map(normalize)
            .filter((value) => value.length > 0),
    );

    return requested.filter((item) => {
        const key = normalize(item);
        return key.length > 0 && !receivedKeys.has(key);
    });
}

function getRequestedItems(input : {
    latestDraft : {
        requestedEvidence : unknown;
        requestedFields : unknown;
        fieldRequests : unknown;
    } | null;
    reasonJson : unknown;
    validationJson : unknown;
}): RequestedItems {
    const requestedFieldsFromDraft = input.latestDraft
        ? getFieldsFromUnknown(input.latestDraft.requestedFields)
        : [];

    const requestedFieldRequestsFromDraft = input.latestDraft
        ? getFieldsFromUnknown(input.latestDraft.fieldRequests)
        : [];

    const requestedEvidenceFromDraft = input.latestDraft
        ? getLabelsFromUnknown(input.latestDraft.requestedEvidence)
        : [];

    const requestedFieldsFromReason = getFieldsFromUnknown(input.reasonJson);
    const requestedEvidenceFromReason = getLabelsFromUnknown(input.reasonJson);

    const requestedFields =
        requestedFieldsFromDraft.length > 0
            ? requestedFieldsFromDraft
            : requestedFieldRequestsFromDraft.length > 0
                ? requestedFieldRequestsFromDraft
                : requestedFieldsFromReason.length > 0
                    ? requestedFieldsFromReason
                    : getFieldsFromUnknown(input.validationJson);

    const requestedEvidence =
        requestedEvidenceFromDraft.length > 0
            ? requestedEvidenceFromDraft
            : requestedEvidenceFromReason.length > 0
                ? requestedEvidenceFromReason
                : getLabelsFromUnknown(input.validationJson);

    return {
        requestedFields,
        requestedEvidence,
    };
}

function getReceivedItems(events : ReopenEventView[]): RequestedItems {
    const receivedFields : string[] = [];
    const receivedEvidence : string[] = [];

    events.forEach((event) => {
        if(!isRecord(event.metadata)){
            return;
        }

        receivedFields.push(...getFieldsFromUnknown(event.metadata.fieldValues));

        if(event.type === "ADDITIONAL_EVIDENCE_RECEIVED"){
            receivedEvidence.push(...getLabelsFromUnknown(event.metadata.evidenceItems));
            return;
        }

        receivedEvidence.push(...getDetailedEvidenceLabels(event.metadata.evidenceItems));
    });

    return {
        requestedFields : uniqueValues(receivedFields),
        requestedEvidence : uniqueValues(receivedEvidence),
    };
}

function getLatestCheckpoint(dates : Array<Date | null>): Date | null {
    const timestamps = dates
        .filter((date) : date is Date => date !== null)
        .map((date) => date.getTime());

    if(timestamps.length === 0){
        return null;
    }

    return new Date(Math.max(...timestamps));
}

export async function POST(_request : Request, { params } : Params) {
    const { taskId } = await params;

    const existingTask = await prisma.reviewTask.findUnique({
        where : {
            id : taskId,
        },
        select : {
            id : true,
            runId : true,
            status : true,
            completedAt : true,
            reasonJson : true,
            run : {
                select : {
                    validationJson : true,
                    events : {
                        where : {
                            type : {
                                in : [
                                    "ADDITIONAL_EVIDENCE_RECEIVED",
                                    "ADDITIONAL_INFORMATION_RECEIVED",
                                ],
                            },
                        },
                        orderBy : {
                            createdAt : "asc",
                        },
                        select : {
                            type : true,
                            createdAt : true,
                            metadata : true,
                        },
                    },
                    followupDrafts : {
                        orderBy : {
                            createdAt : "desc",
                        },
                        take : 1,
                        select : {
                            requestedEvidence : true,
                            requestedFields : true,
                            fieldRequests : true,
                        },
                    },
                },
            },
            decisions : {
                where : {
                    decision : "REQUEST_MORE_INFO",
                },
                orderBy : {
                    createdAt : "desc",
                },
                take : 1,
                select : {
                    createdAt : true,
                },
            },
            events : {
                where : {
                    type : "REVIEW_MORE_INFO_REQUESTED",
                },
                orderBy : {
                    createdAt : "desc",
                },
                take : 1,
                select : {
                    createdAt : true,
                },
            },
        },
    });

    if(!existingTask){
        return NextResponse.json(
            { error : "Review task not found." },
            { status : 404 },
        );
    }

    if(existingTask.status !== "NEEDS_MORE_INFO"){
        return NextResponse.json(
            {
                error : `Only NEEDS_MORE_INFO review tasks can be reopened. Current status: ${existingTask.status}`,
            },
            { status : 400 },
        );
    }

    const checkpoint = getLatestCheckpoint([
        existingTask.completedAt,
        existingTask.decisions[0]?.createdAt ?? null,
        existingTask.events[0]?.createdAt ?? null,
    ]);

    const receivedEvents = existingTask.run.events.filter((event) => {
        if(!checkpoint){
            return true;
        }

        return event.createdAt > checkpoint;
    });

    const latestDraft = existingTask.run.followupDrafts[0] ?? null;
    const requestedItems = getRequestedItems({
        latestDraft,
        reasonJson : existingTask.reasonJson,
        validationJson : existingTask.run.validationJson,
    });
    const receivedItems = getReceivedItems(receivedEvents);

    const unresolvedFields = getMissingItems(
        requestedItems.requestedFields,
        receivedItems.requestedFields,
        normalizeFieldKey,
    );
    const unresolvedEvidence = getMissingItems(
        requestedItems.requestedEvidence,
        receivedItems.requestedEvidence,
        normalizeEvidenceKey,
    );
    const hasKnownRequestedItems =
        requestedItems.requestedFields.length > 0 ||
        requestedItems.requestedEvidence.length > 0;

    if(receivedEvents.length === 0 || unresolvedFields.length > 0 || unresolvedEvidence.length > 0){
        return NextResponse.json(
            {
                error : hasKnownRequestedItems
                    ? "Cannot reopen review task until all requested information or evidence is recorded."
                    : "Cannot reopen review task until requested information or evidence is recorded.",
                unresolvedFields,
                unresolvedEvidence,
            },
            { status : 409 },
        );
    }

    const reviewTask = await prisma.$transaction(async(tx) => {
        await tx.reviewTask.update({
            where : {
                id : taskId,
            },
            data : {
                status : "PENDING",
                startedAt : null,
                completedAt : null,
            },
        });

        await tx.extractionEvent.create({
            data : {
                runId : existingTask.runId,
                type : "REVIEW_REOPENED",
                message : "Review reopened after requested information or evidence was received.",
                metadata : {
                    reviewTaskId : taskId,
                    resolvedFields : receivedItems.requestedFields,
                    resolvedEvidence : receivedItems.requestedEvidence,
                },
            },
        });

        return tx.reviewTask.findUnique({
            where : {
                id : taskId,
            },
            include : {
                run : {
                    include : {
                        document : true,
                        events : {
                            orderBy : {
                                createdAt : "asc",
                            },
                        },
                        followupDrafts : {
                            orderBy : {
                                createdAt : "desc",
                            },
                        },
                    },
                },
                decisions : {
                    orderBy : {
                        createdAt : "desc",
                    },
                },
                events : {
                    orderBy : {
                        createdAt : "asc",
                    },
                },
            },
        });
    });

    return NextResponse.json({
        reviewTask,
    });
}
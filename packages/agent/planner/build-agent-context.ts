import { prisma, ReviewTaskStatus } from "@repo/db";
import { ClaimStateForAgentSchema, type ClaimStateForAgent } from "@repo/shared/schemas";
import { get } from "node:http";

function isRecord(value : unknown): value is Record<string,unknown>{
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringArrayFromRecord(value : unknown, key: string): string[] {
    if(!isRecord(value)){
        return [];
    }

    const field = value[key];

    return Array.isArray(field)
    ? field.filter((item) : item is string => typeof item === "string")
    : [];
};

function getStringArray(value : unknown){
    return Array.isArray(value)
    ? value.filter((item) : item is string => typeof item === "string")
    : [];
}

function getBooleanFromMetadata(value : unknown, key : string): boolean {
    if(!isRecord(value)){
        return false;
    }

    return value[key] === "true";
}

function getDuplicateSignals(
    events: Array<{
        type : string,
        message : string,
    }>
) : string[] {
    return events
    .filter((event) => event.type === "DUPLICATE_UPLOAD_DETECTED")
    .map((event) => event.message);
}

function getRetryCount(
    events: Array<{
        type: string,
        metadata : unknown,
    }>
) : number {
    const extractionStartedEvents = events.filter(
        (event) => event.type === "EXTRACTION_STARTED",
    );

    const explicitRetryEvents = extractionStartedEvents.filter((events) => 
        getBooleanFromMetadata(events.metadata,"isRetry"),
    );

    if(explicitRetryEvents.length > 0){
        return explicitRetryEvents.length;
    }

    // First extraction attempt is not a retry.
    return Math.max(0,extractionStartedEvents.length - 1);
}

export async function buildAgentContext(
    runId: string
) : Promise<ClaimStateForAgent> {
    const run = await prisma.extractionRun.findUnique({
        where : { id : runId },
        include : {
            document : true,
            reviewTask : true,
            coverageQuestions : {
                orderBy : {
                    createdAt : "desc"
                },
                take : 1
            },
            events : {
                orderBy : {
                    createdAt : "desc"
                }
            },
            agentActionLogs : {
                orderBy : {
                    createdAt : "desc"
                },
                take : 10,
            },
        },
    });

    if(!run){
        throw new Error(`Extraction run not found: ${runId}`)
    }

    const latestCoverageQuestion = run.coverageQuestions[0] ?? null;
    const missingFieldsFromValidation = getStringArrayFromRecord(
        run.validationJson,
        "missingFields",
    );

    const requiredEvidence = getStringArrayFromRecord(
        run.validationJson,
        "requiredEvidence",
    );

    const missingFields = 
        missingFieldsFromValidation.length > 0
        ? missingFieldsFromValidation
        : getStringArray(run.missingFieldsJson);

    const duplicateSignals = getDuplicateSignals(run.events);
    const retryCount = getRetryCount(run.events);

    return ClaimStateForAgentSchema.parse({
        runId : run.id,
        runStatus : run.status,

        extractedJson : run.extractedJson,
        validationJson : run.validationJson,

        missingFields,
        requiredEvidence,

        reviewTaskStatus : run.reviewTask?.status ?? null,

        latestRetrievalStatus : latestCoverageQuestion?.retrievalStatus ?? null,
        coverageDecision : latestCoverageQuestion?.finalDecision ?? null,
        hasPolicyEvidence : 
            latestCoverageQuestion?.retrievalStatus === "ENOUGH_EVIDENCE",
        
        retryCount,
        duplicateSignals,

        documentMismatchSignals : [],
        previousAgentActions: run.agentActionLogs
    })
}
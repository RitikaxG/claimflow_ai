import { prisma } from "@repo/db";
import { ClaimStateForAgentSchema, type ClaimStateForAgent } from "@repo/shared/schemas";


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

    return value[key] === true;
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

function getLatestCorrectedValidationJson(
  reviewTask: {
    decisions?: Array<{
      correctedValidationJson: unknown;
    }>;
  } | null,
): unknown | null {
  const latestDecision = reviewTask?.decisions?.[0];

  if (!latestDecision) {
    return null;
  }

  return latestDecision.correctedValidationJson ?? null;
}

function normalizeEvidenceLabel(value : string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g,"");
}

function getReceivedEvidenceFromEvents(
    events : Array<{
        type : string,
        metadata : unknown,
    }>,
): string[] {
    return events
        .filter(
        (event) =>
            event.type === "ADDITIONAL_EVIDENCE_RECEIVED" ||
            event.type === "ADDITIONAL_INFORMATION_RECEIVED",
        )
        .flatMap((event) => {
            if(!isRecord(event.metadata)){
                return [];
            }

            const evidenceItems = event.metadata.evidenceItems;

            if(!Array.isArray(evidenceItems)){
                return [];
            }

            return evidenceItems
                .map((item) => {
                    if(!isRecord(item)){
                        return null;
                    }

                    const label = item.label;

                    return typeof label === "string" && label.trim().length > 0
                        ? label
                        : null;
                })
                .filter((item) : item is string => item !== null);
        });
}

function removeReceivedEvidence(input : {
    requiredEvidence : string[],
    receivedEvidence : string[],
}) {
    const receivedKeys = new Set(
        input.receivedEvidence.map((item) => normalizeEvidenceLabel(item)),
    );

    return input.requiredEvidence.filter((item) => {
        const requiredKey = normalizeEvidenceLabel(item);
        return !receivedKeys.has(requiredKey);
    });
}

function getResolvedFieldsFromEvents(
  events: Array<{
    type: string;
    metadata: unknown;
  }>,
): string[] {
  return events
    .filter(
    (event) =>
        event.type === "ADDITIONAL_EVIDENCE_RECEIVED" ||
        event.type === "ADDITIONAL_INFORMATION_RECEIVED",
    )
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

          const field = item.field;

          return typeof field === "string" && field.trim().length > 0
            ? field
            : null;
        })
        .filter((item): item is string => item !== null);
    });
}

function removeResolvedFields(input: {
  missingFields: string[];
  resolvedFields: string[];
}) {
  const resolvedKeys = new Set(input.resolvedFields.map((item) => item.trim()));

  return input.missingFields.filter((item) => !resolvedKeys.has(item));
}

export async function buildAgentContext(
    runId: string
) : Promise<ClaimStateForAgent> {
    const run = await prisma.extractionRun.findUnique({
        where : { id : runId },
        include : {
            document : true,
            reviewTask : {
                include : {
                    decisions : {
                        orderBy : {
                            createdAt : "desc"
                        },
                        take : 1,
                    }
                }
            },
            coverageQuestions : {
                orderBy : {
                    createdAt : "desc"
                },
                take : 1
            },
            events : {
                orderBy : {
                    createdAt : "asc"
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
    
    const latestCorrectedValidationJson = getLatestCorrectedValidationJson(
        run.reviewTask,
    );

    const effectiveValidationJson =
        latestCorrectedValidationJson ?? run.validationJson;

    const missingFieldsFromValidation = getStringArrayFromRecord(
        effectiveValidationJson,
        "missingFields",
    );

    const requiredEvidenceFromValidation = getStringArrayFromRecord(
        effectiveValidationJson,
        "requiredEvidence",
    );

    const receivedEvidenceFromEvents = getReceivedEvidenceFromEvents(run.events);
    const resolvedFieldsFromEvents = getResolvedFieldsFromEvents(run.events);

    const requiredEvidence = removeReceivedEvidence({
        requiredEvidence : requiredEvidenceFromValidation,
        receivedEvidence : receivedEvidenceFromEvents,
    });

    const rawMissingFields =
        missingFieldsFromValidation.length > 0
            ? missingFieldsFromValidation
            : latestCorrectedValidationJson
            ? []
            : getStringArray(run.missingFieldsJson);

    const missingFields = removeResolvedFields({
        missingFields: rawMissingFields,
        resolvedFields: resolvedFieldsFromEvents,
    });

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
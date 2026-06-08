import { prisma } from "@repo/db";
import type { MemoryReviewFeedback } from "../types";
import { applyMemoryConfidenceUpdate } from "./apply-memory-confidence-update";

export type UpdateMemoryFromReviewOutcomeInput = {
    reviewDecisionId : string,
    memoryFeedback? : MemoryReviewFeedback,
    createdMemoryIds? : string[]
};

export type UpdateMemoryFromReviewOutcomeResult = {
    reviewDecisionId : string,
    runId : string,
    strengthened :number,
    weakened : number,
    retired : number,
    superseded : number,
    feedbackRecorded : number,
    updateMemoryIds : string[],
};


function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasMatchType(hit : UsedMemoryHit, matchTypes : string[]): boolean {
    const matchedOn = Array.isArray(hit.matchedOn) ? hit.matchedOn : [];

    return matchedOn.some((item) => {
        return (
            isRecord(item) &&
            typeof item.type === "string" &&
            matchTypes.includes(item.type)
        )
    });
}

function inferUpdateFromReviewDecision(input : {
    decision : string,
    hit : UsedMemoryHit,
}) : {
    updateType : "STRENGTHENED" | "WEAKENED" | "FEEDBACK_RECORDED",
    note : string
}{
    const { decision, hit } = input;
    const memory = hit.memory;

    const fieldOrEvidenceMatched = hasMatchType(hit, [
        "SAME_FIELD",
        "MISSING_FIELD_MATCH",
        "REQUIRED_EVIDENCE_MATCH",
        "PATTERN_PARTIAL_MATCH",
        "PATTERN_FULL_MATCH",
    ]);

    const entityRiskkMemory = 
        memory.kind === "PRIOR_REJECTION" ||
        memory.kind === "CLAIMANT_PATTERN" ||
        memory.kind === "VENDOR_PATTERN";

    if(decision === "EDIT_AND_APPROVE" && fieldOrEvidenceMatched){
        return {
            updateType : "STRENGTHENED",
            note : "Reviewer edited and approved after a field/evidence memory was used."
        };
    }

    if(decision === "REQUEST_MORE_INFO" && fieldOrEvidenceMatched){
        return {
            updateType : "STRENGTHENED",
            note : "Reviewer requested more information after a field/evidence memory was used."
        }
    }

    if(decision === "REJECT" && entityRiskkMemory){
        return {
            updateType : "STRENGTHENED",
            note : "Reviewer rejected after an entity-risk memory was used for routing."
        }
    }

    if(decision === "APPROVE_AS_IS" && entityRiskkMemory){
        return {
            updateType : "WEAKENED",
            note : "Reviewer approved as-is after an enity risk memory was used; memory was less relevant than expected."
        }
    }

    return {
        updateType : "WEAKENED",
        note : "Reviewer outcome recorded, but no deterministic confidence change was applied.",
    }
}

async function loadUsedMemoryHitsForDecision(reviewDecisionId : string){
    const decision = await prisma.reviewDecision.findUnique({
        where : { id : reviewDecisionId },
        include : {
            task : {
                include : {
                    run : {
                        include : {
                            memoryHits: {
                                where : {
                                    usedByAgent : true,
                                },
                                include : {
                                    memory : true
                                },
                                orderBy : {
                                    createdAt : "desc"
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    if(!decision){
        throw new Error(`Review Decision not found ${reviewDecisionId}`);
    }

    return decision.task.run.memoryHits.map((hit) => ({
        ...hit,
        reviewDecision : decision,
        runId : decision.task.run.id,
    }))
}

type UsedMemoryHit = Awaited<
    ReturnType<typeof loadUsedMemoryHitsForDecision>>[number];

async function supersedeOlderSameScopeMemories(input : {
    reviewDecisionId : string;
    createMemoryIds : string[]
}) : Promise<string[]> {
    if(input.createMemoryIds.length === 0){
        return [];
    }

    const newMemories = await prisma.workflowMemory.findMany({
        where : {
            id : {
                in : input.createMemoryIds
            }
        }
    });

    const supersededMemoryIds : string[] = [];
    for(const newMemory of newMemories){
        const olderMemories = await prisma.workflowMemory.findMany({
            where : {
                id : {
                    not : newMemory.id
                },
                kind : newMemory.kind,
                entityType : newMemory.entityType,
                entityId : newMemory.entityId,
                fieldPath : newMemory.fieldPath,
                status : {
                    in : ["ACTIVE","STRENGTHENED","WEAKENED"]
                }
            },
            take : 25,
        });

        for(const oldMemory of olderMemories){
            const result = await applyMemoryConfidenceUpdate({
                memoryId: oldMemory.id,
                updateType: "SUPERSEDED",
                reviewDecisionId: input.reviewDecisionId,
                supersededByMemoryId: newMemory.id,
                note:
                "Newer reviewer correction created a replacement memory for the same kind/entity/field scope.",
                metadata: {
                newMemoryId: newMemory.id,
                oldMemoryId: oldMemory.id,
                kind: newMemory.kind,
                entityType: newMemory.entityType,
                entityId: newMemory.entityId,
                fieldPath: newMemory.fieldPath,
                },
            });

            if(result.changed){
                supersededMemoryIds.push(oldMemory.id)
            }
        }
    }
    return supersededMemoryIds;
}
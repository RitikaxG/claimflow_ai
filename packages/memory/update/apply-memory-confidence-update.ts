import { Prisma, prisma } from "@repo/db";

export type MemoryLearningUpdateType = 
    | "STRENGTHENED"
    | "WEAKENED"
    | "RETIRED"
    | "SUPERSEDED"
    | "FEEDBACK_RECORDED";

export type ApplyMemoryConfidenceUpdateInput = {
    memoryId : string,
    updateType : MemoryLearningUpdateType,

    runId? : string | null,
    reviewDecisionId? : string | null,

    confidenceDelta? : number,
    note? : string,
    metadata? : Record<string, unknown>,

    supersededByMemoryId? : string | null, 
};

export type ApplyMemoryConfidenceUpdateResult = {
    memoryId : string,
    changed : boolean,
    beforeStatus : string,
    afterStatus : string,
    beforeConfidence : number,
    afterConfidence : number,
    updateType : MemoryLearningUpdateType,
    memoryUpdateId : string | null,
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function clampConfidence(value : number): number {
    return Math.max(0,Math.min(1, Number(value.toFixed(4))));
}

function defaultDeltaFor(updateType : MemoryLearningUpdateType): number {
    if(updateType === "STRENGTHENED") return 0.05;
    if(updateType === "WEAKENED") return -0.1;
    return 0;
}

function getNextStatus(input : {
    updateType : MemoryLearningUpdateType,
    contradictedCountAfter : number,
}){
    if(input.updateType === "SUPERSEDED") return "SUPERSEDED";
    if(input.updateType === "RETIRED") return "RETIRED";

    if(
        input.updateType === "WEAKENED" &&
        input.contradictedCountAfter >= 2 
    ){
        return "RETIRED";
    }

    if(input.updateType === "STRENGTHENED") return "STRENGTHENED";
    if(input.updateType === "WEAKENED") return "WEAKENED";

    return null;
}

export async function applyMemoryConfidenceUpdate(
    input : ApplyMemoryConfidenceUpdateInput
) : Promise<ApplyMemoryConfidenceUpdateResult> {
    return prisma.$transaction(async (tx) => {
        const memory = await tx.workflowMemory.findUnique({
            where : { id : input.memoryId }
        });

        if(!memory){
            throw new Error(`Workflow memory not found ${input.memoryId}`);
        }

        const beforeStatus = memory.status;
        const beforeConfidence = memory.confidence;

        if(memory.status === "RETIRED" || memory.status === "SUPERSEDED"){
            return {
                memoryId : memory.id,
                changed : false,
                beforeStatus,
                afterStatus : beforeStatus,
                beforeConfidence,
                afterConfidence : beforeConfidence,
                updateType : input.updateType,
                memoryUpdateId : null,
            }
        };

        const confirmedIncrement = input.updateType === "STRENGTHENED" ? 1 : 0;
        const contradictedIncrement = input.updateType === "WEAKENED" ? 1 : 0;

        const contradictedCountAfter = 
            memory.contradictedCount + contradictedIncrement;

        const afterStatus = getNextStatus({
            updateType : input.updateType,
            contradictedCountAfter,
        }) ?? memory.status;

        const finalUpdateType : MemoryLearningUpdateType =
            afterStatus === "RETIRED" && input.updateType === "WEAKENED"
            ? "RETIRED"
            : input.updateType;

        const confidenceDelta = input.confidenceDelta ?? defaultDeltaFor(input.updateType);

        const afterConfidence = clampConfidence(
            memory.confidence + confidenceDelta
        );

        const updatedMemory = await tx.workflowMemory.update({
            where : { id : memory.id },
            data : {
                status : afterStatus,
                confidence : afterConfidence,

                confirmedCount :
                    confirmedIncrement > 0
                    ? { increment : confirmedIncrement }
                    : undefined,

                contradictedCount :
                    contradictedIncrement > 0
                    ? { increment : contradictedIncrement }
                    : undefined,

                supersededByMemoryId : 
                    afterStatus === "SUPERSEDED"
                    ? input.supersededByMemoryId ?? null
                    : undefined,
            }
        });

        const memoryUpdate = await tx.memoryUpdate.create({
            data : {
                memoryId : memory.id,
                updateType : finalUpdateType,
                runId : input.runId ?? null,
                reviewDecisionId : input.reviewDecisionId ?? null,
                beforeStatus,
                afterStatus : updatedMemory.status,
                confidenceDelta,
                note : input.note ?? null,
                metadata : toPrismaJson({
                    ...(input.metadata ?? {}),
                    beforeConfidence,
                    afterConfidence,
                    confirmedIncrement,
                    contradictedIncrement,
                    contradictedCountAfter,
                })
            }
        });

        return {
            memoryId : memory.id,
            changed : true,
            beforeStatus,
            afterStatus : updatedMemory.status,
            beforeConfidence,
            afterConfidence,
            updateType : finalUpdateType,
            memoryUpdateId : memoryUpdate.id
        }
    });
}
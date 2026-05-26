import { prisma } from "@repo/db";
import { toPrismaJson } from "./prisma-json";

export type ReviewPriorityInput = "LOW" | "NORMAL" | "HIGH";

const FINAL_REVIEW_TASK_STATUSES = new Set([
    "APPROVED",
    "EDITED_AND_APPROVED",
    "REJECTED"
]);

export function assertReviewTaskIsNotFinal(input : {
    status : string;
    toolName : string;
}){
    if(FINAL_REVIEW_TASK_STATUSES.has(input.status)){
        throw new Error(`${input.toolName} cannot modify a final review task with status ${input.status}`);
    }
};

export async function createOrReuseReviewTask(input : {
    runId : string;
    priority : ReviewPriorityInput;
    reason : string;
    sourceToolName : string;
}){
    return prisma.$transaction(async (tx) => {
        const run = await tx.extractionRun.findUnique({
            where : { id : input.runId },
            include : {
                reviewTask : true
            }
        });

        if(!run){
            throw new Error(`Extraction run not found ${input.runId}`);
        };

        const reasonJson = {
            source : "claimflow_agent_tool",
            sourceToolName : input.sourceToolName,
            reason : input.reason,
            runStatus : run.status,
        };

        if(run.reviewTask){
            assertReviewTaskIsNotFinal({
                status : run.reviewTask.status,
                toolName : input.sourceToolName,
            });

            const updatedTask = tx.reviewTask.update({
                where : { id : run.reviewTask.id },
                data : {
                    priority : input.priority,
                    reasonJson : toPrismaJson(input.reason)
                }
            });

            return {
                reviewTask : updatedTask,
                reused : true,
            }
        }

        const createdTask = tx.reviewTask.create({
            data : {
                runId : input.runId,
                status : "PENDING",
                priority : input.priority,
                reasonJson : toPrismaJson(reasonJson),
                events : {
                    create : {
                        type : "REVIEW_TASK_CREATED",
                        message : "Review task created by Claimflow agent tool.",
                        metadata : toPrismaJson({
                            sourceToolName : input.sourceToolName,
                            reason : input.reason,
                            runStatus : run.status,
                            priority : input.priority,
                        })
                    }
                }
            }
        });

        return {
            reviewTask : createdTask,
            reused : false,
        }
    });
};

export function serializeReviewTask(reviewTask : {
    id : string;
    runId : string;
    status : string;
    priority : string;
    createdAt : Date;
    updatedAt : Date;
}) {
    return {
        id : reviewTask.id,
        runId : reviewTask.runId,
        status : reviewTask.status,
        priority : reviewTask.priority,
        createdAt : reviewTask.createdAt.toISOString(),
        updatedAt : reviewTask.updatedAt.toISOString(),
    }
}
import { tool } from "langchain";
import { z } from "zod";
import { prisma } from "@repo/db";
import { assertReviewTaskIsNotFinal, serializeReviewTask } from "./review-task-helpers";
import { toPrismaJson } from "./prisma-json";
import { failedToolResult, getErrorMessage, okToolResult } from "./tool-result";

const MarkNeedsMoreEvidenceInputSchema = z.object({
    runId : z.string().min(1),
    missingEvidence : z.array(z.string().min(1)).min(1),
    note : z.string().max(2000).optional(),
});

export const markNeedsMoreEvidenceTool = tool(
    async({ runId, missingEvidence, note }) => {
        try{
            const result = await prisma.$transaction(async (tx) => {
                const run = await tx.extractionRun.findUnique({
                    where : { id : runId },
                    include : {
                        reviewTask : true
                    }
                });

                if(!run){
                    throw new Error(`Extraction run not found : ${runId}`);
                }

                const reasonJson = {
                    source : "claimflow_agent_tool",
                    sourceToolName : "mark_needs_more_evidence",
                    missingEvidence,
                    note,
                    status : run.status,
                };

                if(run.reviewTask){
                    assertReviewTaskIsNotFinal({
                        status : run.reviewTask.status,
                        toolName : "mark_needs_more_evidence",
                    });

                    const updatedTask = await tx.reviewTask.update({
                        where : { id : run.reviewTask.id },
                        data : {
                            status : "NEEDS_MORE_INFO",
                            completedAt : new Date(),
                            reasonJson:  toPrismaJson(reasonJson),
                        }
                    });

                    await tx.reviewEvent.create({
                        data : {
                            taskId : updatedTask.id,
                            type : "REVIEW_MORE_INFO_REQUESTED",
                            message : "Agent marked this review task as needing more evidence.",
                            metadata : toPrismaJson(reasonJson),
                        }
                    });

                    return {
                        reviewTask : updatedTask,
                        reused : true,
                    }
                }

                const createdTask = await tx.reviewTask.create({
                    data : {
                        runId,
                        status : "NEEDS_MORE_INFO",
                        priority : "NORMAL",
                        reasonJson : toPrismaJson(reasonJson),
                        completedAt : new Date(),
                        events : {
                            create : {
                                type : "REVIEW_MORE_INFO_REQUESTED",
                                message : "Agent created a review task that needs more evidence.",
                                metadata : toPrismaJson(reasonJson),
                            }
                        }
                    }
                });

                return {
                    reviewTask : createdTask,
                    reused : false,
                }
            });

            return okToolResult({
                action : "MARK_NEEDS_MORE_EVIDENCE",
                runId,
                message : "Review workflow marked as needing more evidence.",
                data : {
                    reusedReviewTask : result.reused,
                    reviewTask : serializeReviewTask(result.reviewTask),
                    missingEvidence,
                    note : note ?? null,
                }
            });
        } catch(error){
            return failedToolResult({
                action : "MARK_NEEDS_MORE_EVIDENCE",
                runId,
                message : "Mark needs more evidence tool failed.",
                error : getErrorMessage(error),
            })
        }
    },{
        name : "mark_needs_more_evidence",
        description : "Mark the review workflow as NEEDS_MORE_INFO when required claim evidence is missing. This does not send email and does not approve or deny the claim.",
        schema : MarkNeedsMoreEvidenceInputSchema,
    }
)
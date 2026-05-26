import { tool } from "langchain";
import { z } from "zod";
import { createOrReuseReviewTask, serializeReviewTask } from "./review-task-helpers";
import { failedToolResult, getErrorMessage, okToolResult } from "./tool-result";

const createReviewTaskInputSchema = z.object({
    runId : z.string().min(1),
    reason : z.string().min(5).max(2000),
    priority : z.enum(["LOW","NORMAL","HIGH"]).default("NORMAL")
});

export const createReviewTaskTool = tool(
    async ({ runId, reason , priority }) => {
        try{
            const { reviewTask, reused } = await createOrReuseReviewTask({
                runId,
                reason,
                priority,
                sourceToolName : "create_review_task",
            });

            return okToolResult({
                action : "CREATE_REVIEW_TASK",
                runId,
                message : reused 
                ? "Existing review task reused for agent workflow."
                : "Review task created for agent workflow",
                data : {
                    reused,
                    reviewTask : serializeReviewTask(reviewTask)
                }
            });
        } catch(error){
            return failedToolResult({
                action : "CREATE_REVIEW_TASK",
                runId,
                message : "Create review task tool failed.",
                error : getErrorMessage(error),
            })
        }
    },{
        name : "create_review_task",
        description : "Create or reuse a human review task for a claim. This routes work to human review and never approves, denies, or closes a claim.",
        schema : createReviewTaskInputSchema,
    }
)
import { tool } from "langchain";
import { z } from "zod";
import { createOrReuseReviewTask, serializeReviewTask } from "./review-task-helpers";
import { failedToolResult, getErrorMessage, okToolResult } from "./tool-result";

const EscalateToHumanInputSchema = z.object({
    runId : z.string().min(1),
    reason : z.string().min(5).max(2000),
    priority : z.enum(["NORMAL","HIGH"]).default("NORMAL"),
});

export const escalateToHumanTool = tool(
    async({ runId, reason, priority }) => {
        try{
            const { reviewTask, reused } = await createOrReuseReviewTask({
                runId,
                priority,
                reason,
                sourceToolName : "escalate_to_human",
            });

            return okToolResult({
                action : "ESCALATE_TO_HUMAN",
                runId,
                message : reused
                ? "Existing review task escalated for human attention."
                : "Human review task created for escalation.",
                data : {
                    reused,
                    escalationReason : reason,
                    reviewTask : serializeReviewTask(reviewTask),
                }
            });
        }catch(error){
            return failedToolResult({
                action : "ESCALATE_TO_HUMAN",
                runId,
                message : "Escalate to human tool failed.",
                error : getErrorMessage(error),
            })
        }
    },{
        name : "escalate_to_human",
        description : "Escalate ambiguous, conflicting, low-confidence, or risky claims to human review. This never approves, denies, or closes the claim.",
        schema : EscalateToHumanInputSchema,
    }
)
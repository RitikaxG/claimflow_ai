import { tool } from "langchain";
import { z } from "zod";
import { failedToolResult, getErrorMessage, okToolResult } from "./tool-result";

const AskClarificationInputSchema = z.object({
    runId : z.string().min(1),
    question : z.string().min(5).max(1000),
    reason : z.string().min(5).max(2000),
    missingFields : z.array(z.string().min(1)).default([]),
});

export const askClarificationTool = tool(
    async ({ runId, question, reason, missingFields }) => {
        try{
            return okToolResult({
                action : "ASK_CLARIFICATION",
                runId,
                message : "Clarification question drafted. No notification was sent automatically.",
                data : {
                    question,
                    reason,
                    missingFields,
                    draftOnly : true,
                    unsafeFinalActionPerformed : false,
                }
            });
        }catch(error){
            return failedToolResult({
                action : "ASK_CLARIFICATION",
                runId,
                message : "Ask clarification tool failed.",
                error : getErrorMessage(error),
            });
        }
    },{
        name : "ask_clarification",
        description: "Draft a clarification question when claim data is ambiguous. This does not send a message and does not make a final decision.",
        schema : AskClarificationInputSchema,
    }
)
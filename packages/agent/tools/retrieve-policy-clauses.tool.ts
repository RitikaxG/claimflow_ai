import { tool } from "langchain";
import { z } from "zod";
import { retrievePolicyEvidence } from "@repo/rag";
import { failedToolResult, getErrorMessage, okToolResult } from "./tool-result";

const claimContextSchema = z.object({
    claimNumber : z.string().nullable().optional(),
    policyNumber : z.string().nullable().optional(),
    lossType : z.string().nullable().optional(),
    damageDescription : z.string().nullable().optional(),
})
.passthrough();

const RetrievedPolicyClausesInputSchema = z.object({
    runId : z.string().min(1),
    question : z.string().min(5).max(1000),
    claimContext : claimContextSchema.default({}),
    topKFinal : z.number().int().min(1).max(12).default(8)
});

function truncateText(text : string, maxLength = 1200){
    if(text.length <= maxLength){
        return text;
    }

    return `${text.slice(0, maxLength).trim()}...`;
};

export const retrievePolicyClausesTool = tool(
    async({ runId, question, claimContext, topKFinal }) => {
        try {
            const retrievalResult = await retrievePolicyEvidence({
                question,
                claimContext,
                topKFinal,
            });

            return okToolResult({
                action : "RETRIEVE_POLICY_CLAUSES",
                runId,
                message : "Policy clauses retrieved for claim workflow routing",
                data : {
                    question : retrievalResult.question,
                    retrievalStatus : retrievalResult.retrievalStatus,
                    reason : retrievalResult.reason,
                    queryPlan : retrievalResult.queryPlan,
                    matches : retrievalResult.matches.map((match) => ({
                        chunkId : match.chunkId,
                        policyDocumentId : match.policyDocumentId,
                        policyTitle : match.policyTitle,
                        clauseId : match.clauseId,
                        sectionTitle : match.sectionTitle,
                        similarity : match.similarity,
                        bestIntent : match.bestIntent,
                        matchedQueries : match.matchedQueries,
                        text : truncateText(match.text)
                    }))
                },
            });
        } catch(error) {
            return failedToolResult({
                action : "RETRIEVE_POLICY_CLAUSES",
                runId,
                message : "Policy retrieval tool failed",
                error : getErrorMessage(error)
            })
        }
    },
    {
        name : "retrieve_policy_clauses",
        description :  "Retrieve relevant policy clauses before drafting approval, denial, escalation, or follow-up reasoning. This is read-only and does not create a final claim decision.",
        schema : RetrievedPolicyClausesInputSchema,
    }
)
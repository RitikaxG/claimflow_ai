import { tool } from "langchain";
import { z } from "zod";
import { failedToolResult, getErrorMessage, okToolResult } from "./tool-result";

const DraftDenialReasonInputSchema = z.object({
    runId : z.string().min(1),
    rationale : z.string().min(10).max(3000),
    citedClauseIds : z.array(z.string().min(1)).default([]),
    missingEvidence : z.array(z.string().min(1)).default([]),
});

function buildDenialReason(input : {
    rationale : string,
    citedClauseIds : string[],
    missingEvidence : string[],
}){
    const citationBlock = 
    input.citedClauseIds.length > 0
    ? input.citedClauseIds.map((item) => `-${item}`).join("\n")
    : "- No policy clause citations provided.";

    const missingEvidenceBlock = 
    input.missingEvidence.length > 0
    ? input.missingEvidence.map((item) => `-${item}`).join("\n")
    : "- No missing evidence isted.";

    return [
        "Draft denial reason",
        "",
        "Rationale:",
        input.rationale,
        "Policy clauses cited:",
        citationBlock,
        "",
        "Missing or unresolved evidence:",
        missingEvidenceBlock,
        "",
        "Human review is required before any final denial or rejection action.",
    ].join("\n");
};

export const draftDenialReasonTool = tool(
    async({ runId, rationale, citedClauseIds, missingEvidence }) => {
        try{
            const reason = buildDenialReason({
                rationale,
                citedClauseIds,
                missingEvidence,
            });

            return okToolResult({
                action : "DRAFT_DENIAL_REASON",
                runId,
                message : "Denial reason drafted. No claim rejection or final decision was made.",
                data : {
                    draftType : "DENIAL_REASON",
                    reason,
                    rationale,
                    citedClauseIds,
                    missingEvidence,
                    requiresHumanApproval : true,
                    unsafeFinalActionPerformed : false,
                }
            });
        }catch(error){
            return failedToolResult({
                action : "DRAFT_DENIAL_REASON",
                runId,
                message : "Draft denial reason tool failed.",
                error : getErrorMessage(error),
            });
        }
    },{
        name : "draft_denial_reason",
        description : "Draft a non-final denial reason when policy evidence suggests the claim may not be covered. This never rejects the claim and always requires human review.",
        schema : DraftDenialReasonInputSchema,
    }
)
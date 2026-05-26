import { tool } from "langchain";
import { z } from "zod";
import { failedToolResult, getErrorMessage, okToolResult } from "./tool-result";

const DraftApprovalNoteInputSchema = z.object({
    runId : z.string().min(1),
    rationale : z.string().min(10).max(3000),
    citedClauseIds : z.array(z.string().min(1)).default([]),
    evidenceSummary : z.array(z.string().min(1)).default([]),
});

function buildApprovalNote(input : {
    rationale : string;
    citedClauseIds : string[];
    evidenceSummary : string[];
}){
    const evidenceBlock = 
    input.evidenceSummary.length > 0
    ? input.evidenceSummary.map((item) => `- ${item}`).join("\n")
    : "- No evidence summary provided by the agent.";

    const citationBlock = 
    input.citedClauseIds.length > 0
    ? input.citedClauseIds.map((item) => `- ${item}`).join("\n")
    : "- No policy clause citations provided";

    return [
        "Draft approval note",
        "",
        "Rationale:",
        input.rationale,
        "",
        "Evidence considered:",
        evidenceBlock,
        "",
        "Polciy clause cited:",
        citationBlock,
        "",
        "Human approval is required before any final claim action."
    ].join("\n");
}

export const draftApprovalNoteTool = tool(
    async ({ runId, rationale, citedClauseIds, evidenceSummary }) => {
        try{
            const note = buildApprovalNote({
                rationale,
                citedClauseIds,
                evidenceSummary
            });

            return okToolResult({
                action : "DRAFT_APPROVAL_NOTE",
                runId,
                message : "Approval note drafted. No claim approval or final decision was made.",
                data : {
                    draftType : "APPROVAL_NOTE",
                    note,
                    rationale,
                    citedClauseIds,
                    evidenceSummary,
                    requiresHumanApproval : true,
                    unsafeFinalActionPerformed : false,
                }
            });
        } catch(error){
            return failedToolResult({
                action : "DRAFT_APPROVAL_NOTE",
                runId,
                message : "Draft approval note tool failed",
                error : getErrorMessage(error),
            });
        }
    },{
        name : "draft_approval_note",
        description: "Draft a non-final approval note when evidence and policy support appear sufficient. This never approves the claim and always requires human approval.",
        schema : DraftApprovalNoteInputSchema,
    }
)
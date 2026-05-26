import { prisma } from "@repo/db";
import { tool } from "langchain";
import { z } from "zod";
import { toPrismaJson } from "./prisma-json";
import { failedToolResult, getErrorMessage, okToolResult } from "./tool-result";

const DraftFollowupRequestInputSchema = z.object({
    runId : z.string().min(1),
    missingEvidence : z.array(z.string().min(1)).min(1),
    claimNumber : z.string().nullable().optional(),
    recipientLabel : z.string().nullable().optional(),
});

function buildSubject(claimNumber? : string | null){
    if(claimNumber && claimNumber.trim().length > 0){
        return `Additional documents required for claim ${claimNumber.trim()}`;
    }
    return "Additional documents required for claim review";
};

function buildBody(input : {
    missingEvidence : string[],
    claimNumber? : string | null,
    recipientLabel? : string | null,
}){
    const recipient = input.recipientLabel?.trim() ?? "Customer";
    const claimLine =
    input.claimNumber && input.claimNumber.trim().length > 0
    ? ` for claim ${input.claimNumber.trim()}`
    : "";

    const evidenceList = input.missingEvidence
    .map((item,index) => `${index + 1}. ${item}`)
    .join("\n");

    return [
        `Hi ${recipient},`,
        "",
        `We need the following additional document(s) to continue reviewing your claim${claimLine}:`,
        "",
        evidenceList,
        "Please upload or share these documents so the review can be reopened.",
        "",
        "This is a draft follow-up request and has not been sent automatically.",
    ].join("\n");
};

export const draftFollowupRequestTool = tool(
    async ({ runId, missingEvidence, claimNumber, recipientLabel }) => {
        try {
            const run = await prisma.extractionRun.findUnique({
                where : { id : runId },
                select : {
                    id : true,
                }
            });

            if(!run){
                throw new Error(`Extraction run not found: ${runId}`);
            }

            const subject = buildSubject(claimNumber);
            const body = buildBody({
                missingEvidence,
                claimNumber,
                recipientLabel,
            });

            const followupDraft = await prisma.followupDraft.create({
                data : {
                    runId,
                    subject,
                    body,
                    requestedEvidence : toPrismaJson(missingEvidence),
                    status : "DRAFTED",
                }
            });

            return okToolResult({
                action : "DRAFT_FOLLOWUP_REQUEST",
                runId,
                message : "Follow-up request drafted. No email was sent and no final claim decision was made.",
                data : {
                    followupDraftId : followupDraft.id,
                    subject : followupDraft.subject,
                    body : followupDraft.body,
                    requestedEvidence : followupDraft.requestedEvidence,
                    status : followupDraft.status,
                    createdAt : followupDraft.createdAt.toISOString(),
                }
            });
        }catch(error){
            return failedToolResult({
                action : "DRAFT_FOLLOWUP_REQUEST",
                runId,
                message : "Draft follow-up request tool failed.",
                error : getErrorMessage(error),
            });
        }
    },
    {
        name : "draft_followup_request",
        description: "Draft a follow-up request when claim evidence is missing. This only creates a draft and never sends email.",
        schema : DraftFollowupRequestInputSchema,
    }
)
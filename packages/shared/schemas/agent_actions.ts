import { z } from "zod";

export const AgentActionTypeSchema = z.enum([
    "RETRIEVE_POLICY_CLAUSES",
    "CREATE_REVIEW_TASK",
    "REQUEST_MISSING_DOCUMENT",
    "MARK_NEEDS_MORE_EVIDENCE",
    "DRAFT_FOLLOWUP_REQUEST",
    "DRAFT_APPROVAL_NOTE",
    "DRAFT_DENIAL_REASON",
    "ESCALATE_TO_HUMAN",
    "ASK_CLARIFICATION",
    "NO_ACTION"
]);

export const AgentActionStatusSchema = z.enum([
    "PROPOSED",
    "EXECUTED",
    "BLOCKED",
    "FAILED"
]);

export const GuardrailDecisionSchema = z.enum([
    "ALLOWED",
    "BLOCKED"
]);

export const ClaimStateForAgentSchema = z.object({
    runId : z.string(),
    runStatus : z.string(),

    extractedJson : z.unknown().nullable(),
    validationJson : z.unknown().nullable(),

    missingFields : z.array(z.string()),
    requiredEvidence : z.array(z.string()),

    reviewTaskStatus : z.string().nullable(),

    latestRetrievalStatus : z.string().nullable(),
    coverageDecision : z.string().nullable(),
    hasPolicyEvidence : z.boolean(),

    retryCount : z.number(),

    duplicateSignals: z.array(z.string()),
    documentMismatchSignals: z.array(z.string()),

    previousAgentActions: z.array(z.unknown()).default([]),
});

export const ProposedAgentActionSchema = z.object({
    runId : z.string(),
    action: AgentActionTypeSchema,
    rationale: z.string().optional(),
    toolName : z.string().nullable().optional(),
    toolInputJson: z.unknown().nullable().optional(),
});

export type AgentActionType = z.infer<typeof AgentActionTypeSchema>;
export type AgentActionStatus = z.infer<typeof AgentActionStatusSchema>;
export type GuardrailDecision = z.infer<typeof GuardrailDecisionSchema>;
export type ClaimStateForAgent = z.infer<typeof ClaimStateForAgentSchema>;
export type ProposedAgentAction = z.infer<typeof ProposedAgentActionSchema>;
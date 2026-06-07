import { z } from "zod";

export const AgentActionTypeSchema = z.enum([
    "RETRIEVE_POLICY_CLAUSES",
    "CREATE_REVIEW_TASK",
    "REQUEST_MISSING_DOCUMENT",
    "MARK_NEEDS_MORE_EVIDENCE",
    "MARK_NEEDS_MORE_INFO",
    "DRAFT_FOLLOWUP_REQUEST",
    "DRAFT_INFORMATION_REQUEST",
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

export const AgentMemoryMatchSignalSchema = z.object({
    type : z.string(),
    value: z.string(),
    points : z.number()
});

export const AgentRelevantMemorySchema = z.object({
    memoryId : z.string(),
    memoryHitId : z.string().nullable().optional(),

    kind : z.string(),
    status : z.string(),
    riskLevel : z.string(),

    confidence : z.number(),
    score : z.number(),

    summary : z.string(),
    safeUse : z.string(),
    mustNotDo : z.array(z.string()),

    entityType : z.string().nullable().optional(),
    entityId : z.string().nullable().optional(),
    fieldPath : z.string().nullable().optional(),

    matchedOn : z.array(AgentMemoryMatchSignalSchema).default([]),
    retrievalReason : z.string().default("")
});

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

    relevantMemories : z.array(AgentRelevantMemorySchema).default([]),
    workflowMemoryContext : z.string().default(
        "No relevant workflow memories were retrieved"
    ),

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
export type AgentMemoryMatchSignal = z.infer<typeof AgentMemoryMatchSignalSchema>;
export type AgentRelevantMemory = z.infer<typeof AgentRelevantMemorySchema>;
export type ClaimStateForAgent = z.infer<typeof ClaimStateForAgentSchema>;
export type ProposedAgentAction = z.infer<typeof ProposedAgentActionSchema>;
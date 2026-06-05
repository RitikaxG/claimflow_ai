import { z } from "zod";

export const WorkflowMemoryKindSchema = z.enum([
    "HUMAN_CORRECTION",
    "PRIOR_REJECTION",
    "PRIOR_REVEW_DECISION",
    "CLAIMANT_PATTERN",
    "VENDOR_PATTERN",
    "POLICY_HISTORY",
    "RECURRING_ERROR_PATTERN"
]);

export const WorkflowMemoryRiskLevelSchema = z.enum([
    "LOW",
    "MEDIUM",
    "HIGH"
]);

export const WorkflowMemoryStatusSchema = z.enum([
    "ACTIVE",
    "STRENGTHENED",
    "WEAKENED",
    "SUPERSEDED",
    "RETIRED"
]);

export const MemoryObservationSchema = z.object({
    observationId : z.string(),
    sourceType : z.string(),
    sourceId : z.string(),
    sourcePacketId : z.string().nullable().optional(),
    historicalClaimId : z.string().nullable().optional(),
    observationType : z.string(),
    entityType : z.string().nullable().optional(),
    entityId : z.string().nullable().optional(),
    fieldPath : z.string().nullable().optional(),
    beforeValue : z.string().nullable().optional(),
    afterValue : z.string().nullable().optional(),
    tags : z.array(z.string()).default([]),
    riskLevel : WorkflowMemoryRiskLevelSchema,
    shouldCreateMemory : z.boolean(),
    recommendedMemoryKind : WorkflowMemoryKindSchema,
    summry : z.string(),
    safeUse : z.string(),
    mustNotDo : z.array(z.string()),
    evidenceJson : z.record(z.string(), z.unknown()).nullable().optional(),
});

export type MemoryObservation = z.infer<typeof MemoryObservationSchema>;

export const WorkflowMemorySeedSchema = z.object({
    memorySeedId : z.string(),
    kind : WorkflowMemoryKindSchema,
    status : WorkflowMemoryStatusSchema,
    riskLevel : WorkflowMemoryRiskLevelSchema,
    confidence : z.number(),
    summary : z.string(),
    safeUse : z.string(),
    mustNotDo : z.array(z.string()),
    entityType : z.string().nullable().optional(),
    entityId : z.string().nullable().optional(),
    fieldPath : z.string().nullable().optional(),
    tags : z.array(z.string()).default([]),
    evidenceJson : z.record(z.string(), z.unknown()).nullable().optional(),
    sourceRunId : z.string().nullable().optional(),
    sourceReviewDecisionId : z.string().nullable().optional(),
    sourceCoverageQuestionId : z.string().nullable().optional(),
    sourceAgentActionLogId : z.string().nullable().optional(),
    confirmedCount : z.number().default(0),
    contradictedCount : z.number().default(0),
});

export type WorkflowMemorySeed = z.infer<typeof WorkflowMemorySeedSchema>;

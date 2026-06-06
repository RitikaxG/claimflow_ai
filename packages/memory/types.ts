import { z } from "zod";

export const WorkflowMemoryKindSchema = z.enum([
  "HUMAN_CORRECTION",
  "PRIOR_REJECTION",
  "PRIOR_REVIEW_DECISION",
  "CLAIMANT_PATTERN",
  "VENDOR_PATTERN",
  "POLICY_HISTORY",
  "RECURRING_ERROR_PATTERN",
]);

export const WorkflowMemoryRiskLevelSchema = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
]);

export const WorkflowMemoryStatusSchema = z.enum([
  "ACTIVE",
  "STRENGTHENED",
  "WEAKENED",
  "SUPERSEDED",
  "RETIRED",
]);

export const MemoryObservationSchema = z.object({
  observationId: z.string(),
  sourceType: z.string(),
  sourceId: z.string(),
  sourcePacketId: z.string().nullable().optional(),
  historicalClaimId: z.string().nullable().optional(),
  observationType: z.string(),
  entityType: z.string().nullable().optional(),
  entityId: z.string().nullable().optional(),
  fieldPath: z.string().nullable().optional(),
  beforeValue: z.unknown().nullable().optional(),
  afterValue: z.unknown().nullable().optional(),
  tags: z.array(z.string()).default([]),
  riskLevel: WorkflowMemoryRiskLevelSchema,
  shouldCreateMemory: z.boolean(),
  recommendedMemoryKind: WorkflowMemoryKindSchema,
  summary: z.string(),
  safeUse: z.string(),
  mustNotDo: z.array(z.string()),
  evidenceJson: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type MemoryObservation = z.infer<typeof MemoryObservationSchema>;

export const WorkflowMemorySeedSchema = z.object({
  memorySeedId: z.string(),
  kind: WorkflowMemoryKindSchema,
  status: WorkflowMemoryStatusSchema,
  riskLevel: WorkflowMemoryRiskLevelSchema,
  confidence: z.number(),
  summary: z.string(),
  safeUse: z.string(),
  mustNotDo: z.array(z.string()),
  entityType: z.string().nullable().optional(),
  entityId: z.string().nullable().optional(),
  fieldPath: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  evidenceJson: z.record(z.string(), z.unknown()).nullable().optional(),
  sourceRunId: z.string().nullable().optional(),
  sourceReviewDecisionId: z.string().nullable().optional(),
  sourceCoverageQuestionId: z.string().nullable().optional(),
  sourceAgentActionLogId: z.string().nullable().optional(),
  confirmedCount: z.number().default(0),
  contradictedCount: z.number().default(0),
});

export type WorkflowMemorySeed = z.infer<typeof WorkflowMemorySeedSchema>;

export const MemoryEntityHintSchema = z.object({
  entityType: z.enum(["CLAIMANT", "POLICY", "VENDOR", "FIELD_PATH"]),
  entityId: z.string(),
});

export type MemoryEntityHint = z.infer<typeof MemoryEntityHintSchema>;

export const MemoryClaimStateSchema = z.object({
  runId: z.string().optional(),
  packetId: z.string().optional(),

  customerId: z.string().nullable().optional(),
  claimantId: z.string().nullable().optional(),
  policyId: z.string().nullable().optional(),
  vendorId: z.string().nullable().optional(),

  extractedJson: z.unknown().nullable().optional(),
  validationJson: z.unknown().nullable().optional(),

  missingFields: z.array(z.string()).default([]),
  requiredEvidence: z.array(z.string()).default([]),

  runStatus: z.string().nullable().optional(),
  reviewTaskStatus: z.string().nullable().optional(),
  retrievalStatus: z.string().nullable().optional(),
  policyDecision: z.string().nullable().optional(),
});

export type MemoryClaimState = z.infer<typeof MemoryClaimStateSchema>;

export const MemoryMatchSignalSchema = z.object({
  type: z.enum([
    "EXACT_CLAIMANT",
    "EXACT_VENDOR",
    "EXACT_POLICY",
    "SAME_FIELD",
    "SAME_LOSS_TYPE",
    "HIGH_RISK_MEMORY",
    "HUMAN_VERIFIED_MEMORY",
    "CONFIRMED_MEMORY",
    "CONTRADICTED_BEFORE",
    "NAME_ONLY_WEAK_MATCH",
  ]),
  value: z.string(),
  points: z.number(),
});

export type MemoryMatchSignal = z.infer<typeof MemoryMatchSignalSchema>;

export const RelevantMemorySchema = z.object({
  memoryId: z.string(),
  memoryHitId: z.string().nullable().optional(),

  kind: WorkflowMemoryKindSchema,
  status: WorkflowMemoryStatusSchema,
  riskLevel: WorkflowMemoryRiskLevelSchema,

  confidence: z.number(),
  score: z.number(),

  summary: z.string(),
  safeUse: z.string(),
  mustNotDo: z.array(z.string()),

  entityType: z.string().nullable(),
  entityId: z.string().nullable(),
  fieldPath: z.string().nullable(),

  matchedOn: z.array(MemoryMatchSignalSchema),
  retrievalReason: z.string(),
});

export type RelevantMemory = z.infer<typeof RelevantMemorySchema>;
import { z } from "zod";

export const CoverageDecisionSchema = z.enum([
    "COVERED",
    "NOT_COVERED",
    "PARTIALLY_COVERED",
    "NEEDS_REVIEW"
]);

export const CitedCoverageClauseSchema = z.object({
    clauseId : z.string().min(1),
    chunkId : z.string().min(1),
    quote : z.string().min(1),
    relevance : z.string().min(1)
});

export const CoverageAnswerSchema = z.object({
    decision : CoverageDecisionSchema,
    answer : z.string().min(1),
    citedClauses : z.array(CitedCoverageClauseSchema),
    missingEvidence : z.array(z.string()),
    confidence : z.number().min(0).max(1)
});

export type CoverageDecision = z.infer<typeof CoverageDecisionSchema>;
export type CitedCoverageClause = z.infer<typeof CitedCoverageClauseSchema>;
export type CoverageAnswer = z.infer<typeof CoverageAnswerSchema>;
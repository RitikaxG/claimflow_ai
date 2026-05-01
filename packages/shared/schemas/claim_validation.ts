import { z } from "zod";

export const ValidationIssueSeveritySchema = z.enum([
    "error",
    "warning",
]);

export const ClaimValidationIssueSchema = z.object({
    field : z.string(),
    message : z.string(),
    severity : ValidationIssueSeveritySchema,
    ruleId : z.string(),
});

export const ClaimValidationResultSchema = z.object({
    isValid : z.boolean(),

    missingFields : z.array(z.string()),
    conflicts : z.array(ClaimValidationIssueSchema),
    warnings : z.array(ClaimValidationIssueSchema),

    requiredEvidence : z.array(z.string()),

    finalStatus : z.enum([
        "COMPLETED",
        "NEEDS_REVIEW",
    ])
});

export type ClaimValidationResult = z.infer<typeof ClaimValidationResultSchema>;
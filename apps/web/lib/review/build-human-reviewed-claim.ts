/*
- Reviewer does not need to manually clean missingEvidence.
- Backend recomputes missingFields/conflicts/requiredEvidence.
- Low confidence alone does not block human approval.
- Missing FIR / policyNumber / police report still blocks approval.
*/

import { type ClaimExtraction } from "@repo/shared/schemas";
import { validateClaimExtraction } from "@repo/shared/validation";

export function buildHumanReviewedClaim(claim: ClaimExtraction) {
    const validation = validateClaimExtraction(claim);

    const hasBlockingIssues =
        validation.missingFields.length > 0 ||
        validation.conflicts.some((issue) => issue.severity === "error") ||
        validation.requiredEvidence.length > 0

    const normalizedClaim : ClaimExtraction = {
        ...claim,
        missingEvidence : validation.requiredEvidence,
    };

    const correctedValidationForReview = {
        ...validation,
        isValid : !hasBlockingIssues,
        finalStatus : hasBlockingIssues ? "NEEDS_REVIEW" : "COMPLETED",
        humanApproved : !hasBlockingIssues,
        approvedByReviewer : !hasBlockingIssues,
        originalRuleFinalStatus : validation.finalStatus,
    };

    return {
        normalizedClaim,
        correctedValidationForReview,
        hasBlockingIssues,
    }
}
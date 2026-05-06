import { ClaimExtractionSchema, ClaimValidationResult, ClaimValidationResultSchema } from "../schemas";

type ValidationIssue = ClaimValidationResult["conflicts"][number];

const REVIEW_CONFIDENCE_THRESHOLD = 0.75;

function hasText(value : string | null | undefined) : value is string{
    return typeof value === "string" && value.trim().length > 0;
}

function addUnique(list : string[], value: string){
    if(!list.includes(value)){
        list.push(value);
    }
};

export function validateClaimExtraction(input : unknown): ClaimValidationResult {
    const claim = ClaimExtractionSchema.parse(input);

    const missingFields : string[] = [];
    const conflicts : ValidationIssue[] = [];
    const warnings : ValidationIssue[] = [];
    const requiredEvidence : string[] = [];

    const addMissingField = (field : string) => {
        addUnique(missingFields,field)
    };

    const addRequiredEvidence = (evidence : string) => {
        addUnique(requiredEvidence, evidence);
    };

    const addConflict = (issue : ValidationIssue) => {
        conflicts.push(issue);
    };

    const addWarning = (issue : ValidationIssue) => {
        warnings.push(issue);
    };

    /*
    1. Required / Missing fields
    */

    if(!hasText(claim.policyNumber)){
        addMissingField("policyNumber");
    }

    if(!hasText(claim.claimantName) && !hasText(claim.insuredName)){
        addMissingField("claimantName_or_insuredName");
    }

    if(!hasText(claim.vehicle.registrationNumber)){
        addMissingField("vehicle.registrationNumber")
    }

    if(!hasText(claim.incident.incidentDate)){
        addMissingField("incident.incidentDate");
    }

    if(!hasText(claim.incident.incidentLocation)){
        addMissingField("incident.incidentLocation");
    }

    if(!hasText(claim.incident.description)){
        addMissingField("incident.description");
    }

    /*
    2. Conflicts / Invalid Values
    */

    if(claim.incident.lossType === "unknown"){
        addConflict({
            field : "incident.lossType",
            message : "Loss type is unknown",
            severity : "error",
            ruleId : "LOSS_TYPE_UNKNOWN",
        });
    }

    if(typeof claim.damage.estimatedRepairCost === "number" &&
        claim.damage.estimatedRepairCost <= 0
    ){
        addConflict({
            field : "damage.estimatedRepairCost",
            message : "Estimated repair cost must be greater than 0",
            severity : "error",
            ruleId : "INVALID_REPAIR_COST",
        });
    }

    if(typeof claim.damage.estimatedRepairCost === "number" &&
        claim.damage.estimatedRepairCost > 0 &&
        !hasText(claim.damage.currency)
    ){
        addConflict({
            field : "damage.currency",
            message : "Currency is required when estimated repair cost is present",
            severity : "error",
            ruleId : "CURRENCY_REQUIRED_WITH_REPAIR_COST",
        });
    }

    /*
    3. Warnings / Review Triggers
    */

    if(claim.documentType === "repair_estimate"){
        addWarning({
            field : "documentType",
            message : "Document is a repair estimate not a complete auto insurance claim form.",
            severity : "warning",
            ruleId : "DOCUMENT_TYPE_REPAIR_ESTIMATE_ONLY",
        });

        addRequiredEvidence("claimForm");
    }

    if(claim.overallConfidence < REVIEW_CONFIDENCE_THRESHOLD){
        addWarning({
            field : "overallConfidence",
            message : "Extraction confidence is below review threshold.",
            severity : "warning",
            ruleId : "LOW_CONFIDENCE_REVIEW",
        });
    }

    if(claim.incident.lossType === "third_party" &&
        claim.supportingDocuments.policeReport === false
    ) {
        addWarning({
            field : "supportingDocuments.policeReport",
            message : "Police report is recommended for third-party claims.",
            severity : "warning",
            ruleId : "THIRD_PARTY_POLICE_REPORT_RECOMMENDED",
        });

        addRequiredEvidence("policeReport");
    }

    if(claim.incident.lossType === "theft"){
        if(!hasText(claim.police.firNumber)){
            addMissingField("police.firNumber");
            addRequiredEvidence("firNumber");
        }

        if(claim.supportingDocuments.policeReport === false){
            addWarning({
                field : "supportingDocuments.policeReport",
                message : "Police report is required or strongly recommended for theft claims.",
                severity : "warning",
                ruleId : "THEFT_POLICE_REPORT_REQUIRED",
            });

            addRequiredEvidence("policeReport");
        }
    }

    /*
    4. Final status decision
    */

    const hasMissingFields = missingFields.length > 0;
    const hasErrorConflicts = conflicts.some(
        (issue) => issue.severity === "error",
    );

    const hasMissingRequiredEvidence = requiredEvidence.length > 0;
    const hasLowConfidence = claim.overallConfidence < REVIEW_CONFIDENCE_THRESHOLD;

    const finalStatus =
    hasMissingFields || 
    hasErrorConflicts ||
    hasMissingRequiredEvidence ||
    hasLowConfidence
    ? "NEEDS_REVIEW"
    : "COMPLETED";

    const result : ClaimValidationResult = {
        isValid : finalStatus === "COMPLETED",
        missingFields,
        conflicts,
        warnings,
        requiredEvidence,
        finalStatus,
    };

    return ClaimValidationResultSchema.parse(result);

}
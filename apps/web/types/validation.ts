export type ValidationIssueView = {
  field: string;
  message: string;
  severity: "error" | "warning";
  ruleId: string;
};

export type ValidationResultView = {
  isValid: boolean;
  missingFields: string[];
  conflicts: ValidationIssueView[];
  warnings: ValidationIssueView[];
  requiredEvidence: string[];
  finalStatus: "COMPLETED" | "NEEDS_REVIEW";
};

function isValidationIssueView(value: unknown): value is ValidationIssueView {
  if (!value || typeof value !== "object") {
    return false;
  }

  const issue = value as Partial<ValidationIssueView>;

  return (
    typeof issue.field === "string" &&
    typeof issue.message === "string" &&
    (issue.severity === "error" || issue.severity === "warning") &&
    typeof issue.ruleId === "string"
  );
}

export function isValidationResultView(
  value: unknown,
): value is ValidationResultView {
  if (!value || typeof value !== "object") {
    return false;
  }

  const result = value as Partial<ValidationResultView>;

  return (
    typeof result.isValid === "boolean" &&
    Array.isArray(result.missingFields) &&
    result.missingFields.every((field) => typeof field === "string") &&
    Array.isArray(result.conflicts) &&
    result.conflicts.every(isValidationIssueView) &&
    Array.isArray(result.warnings) &&
    result.warnings.every(isValidationIssueView) &&
    Array.isArray(result.requiredEvidence) &&
    result.requiredEvidence.every((evidence) => typeof evidence === "string") &&
    (result.finalStatus === "COMPLETED" ||
      result.finalStatus === "NEEDS_REVIEW")
  );
}
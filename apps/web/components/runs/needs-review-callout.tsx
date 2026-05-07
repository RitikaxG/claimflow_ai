import {
  isValidationResultView,
  type ValidationIssueView,
} from "../../types/validation";

type NeedsReviewCalloutProps = {
  validationJson: unknown | null;
};

function toTitleCase(value: string) {
  return value
    .replaceAll("_or_", " or ")
    .replaceAll("_", " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\bfir\b/gi, "FIR")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatFieldPath(field: string) {
  return field.split(".").map(toTitleCase).join(" → ");
}

function ReviewReasonList({
  values,
  emptyText,
}: {
  values: string[];
  emptyText: string;
}) {
  if (values.length === 0) {
    return <p className="mt-2 text-sm text-gray-500">{emptyText}</p>;
  }

  return (
    <ul className="mt-2 space-y-1">
      {values.map((value) => (
        <li key={value} className="text-sm text-orange-800">
          • {formatFieldPath(value)}
        </li>
      ))}
    </ul>
  );
}

function IssueReasonList({
  issues,
  emptyText,
}: {
  issues: ValidationIssueView[];
  emptyText: string;
}) {
  if (issues.length === 0) {
    return <p className="mt-2 text-sm text-gray-500">{emptyText}</p>;
  }

  return (
    <ul className="mt-2 space-y-2">
      {issues.map((issue) => (
        <li key={`${issue.ruleId}-${issue.field}`} className="text-sm">
          <p className="font-medium text-orange-900">
            • {formatFieldPath(issue.field)}
          </p>
          <p className="mt-0.5 text-orange-800">{issue.message}</p>
        </li>
      ))}
    </ul>
  );
}

export function NeedsReviewCallout({
  validationJson,
}: NeedsReviewCalloutProps) {
  const validation = isValidationResultView(validationJson)
    ? validationJson
    : null;

  if (!validation || validation.finalStatus !== "NEEDS_REVIEW") {
    return null;
  }

  return (
    <section className="rounded-2xl border border-orange-200 bg-orange-50 p-5 shadow-sm">
      <div>
        <p className="text-sm font-medium text-orange-700">
          Human review required
        </p>

        <h2 className="mt-1 text-lg font-semibold text-gray-950">
          This run needs review before completion.
        </h2>

        <p className="mt-1 text-sm text-orange-800">
          The AI extraction completed, but deterministic validation found issues
          that should be checked by a reviewer.
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-orange-100 bg-white/70 p-4">
          <h3 className="font-medium text-gray-950">Missing fields</h3>
          <ReviewReasonList
            values={validation.missingFields}
            emptyText="No missing fields."
          />
        </div>

        <div className="rounded-xl border border-orange-100 bg-white/70 p-4">
          <h3 className="font-medium text-gray-950">Required evidence</h3>
          <ReviewReasonList
            values={validation.requiredEvidence}
            emptyText="No additional evidence required."
          />
        </div>

        <div className="rounded-xl border border-orange-100 bg-white/70 p-4">
          <h3 className="font-medium text-gray-950">
            Conflicts ({validation.conflicts.length})
          </h3>
          <IssueReasonList
            issues={validation.conflicts}
            emptyText="No conflicts detected."
          />
        </div>

        <div className="rounded-xl border border-orange-100 bg-white/70 p-4">
          <h3 className="font-medium text-gray-950">
            Warnings ({validation.warnings.length})
          </h3>
          <IssueReasonList
            issues={validation.warnings}
            emptyText="No warnings detected."
          />
        </div>
      </div>
    </section>
  );
}
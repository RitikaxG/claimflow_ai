import {
  isValidationResultView,
  type ValidationIssueView,
} from "../../types/validation";

type ConflictsCardProps = {
  validationJson: unknown | null;
};

function IssueList({
  title,
  emptyText,
  issues,
}: {
  title: string;
  emptyText: string;
  issues: ValidationIssueView[];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-950">{title}</h3>

      {issues.length === 0 ? (
        <p className="mt-2 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
          {emptyText}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {issues.map((issue) => (
            <li
              key={`${issue.ruleId}-${issue.field}`}
              className={`rounded-xl border px-4 py-3 text-sm ${
                issue.severity === "error"
                  ? "border-red-100 bg-red-50"
                  : "border-yellow-100 bg-yellow-50"
              }`}
            >
              <div className="font-medium text-gray-950">{issue.field}</div>
              <p className="mt-1 text-gray-700">{issue.message}</p>
              <p className="mt-2 text-xs font-medium text-gray-500">
                {issue.severity.toUpperCase()} · {issue.ruleId}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ConflictsCard({ validationJson }: ConflictsCardProps) {
  const validation = isValidationResultView(validationJson)
    ? validationJson
    : null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-gray-950">
          Conflicts and warnings
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Rule-based issues that explain why the run completed or needs review.
        </p>
      </div>

      {!validation ? (
        <div className="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
          No validation issues yet.
        </div>
      ) : (
        <div className="mt-5 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <IssueList
              title="Conflicts"
              emptyText="No conflicts detected."
              issues={validation.conflicts}
            />

            <IssueList
              title="Warnings"
              emptyText="No warnings detected."
              issues={validation.warnings}
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-950">
              Required evidence
            </h3>

            {validation.requiredEvidence.length === 0 ? (
              <p className="mt-2 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                No additional evidence required.
              </p>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-2">
                {validation.requiredEvidence.map((evidence) => (
                  <li
                    key={evidence}
                    className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-800"
                  >
                    {evidence}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
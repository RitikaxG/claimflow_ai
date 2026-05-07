import { isValidationResultView } from "../../types/validation";

type NeedsReviewCalloutProps = {
  validationJson: unknown | null;
};

function formatList(values: string[]) {
  if (values.length === 0) {
    return "None";
  }

  return values.join(", ");
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

      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
        <div className="rounded-xl border border-orange-100 bg-white/70 p-4">
          <dt className="font-medium text-gray-950">Missing fields</dt>
          <dd className="mt-1 break-words text-orange-800">
            {formatList(validation.missingFields)}
          </dd>
        </div>

        <div className="rounded-xl border border-orange-100 bg-white/70 p-4">
          <dt className="font-medium text-gray-950">Required evidence</dt>
          <dd className="mt-1 break-words text-orange-800">
            {formatList(validation.requiredEvidence)}
          </dd>
        </div>

        <div className="rounded-xl border border-orange-100 bg-white/70 p-4">
          <dt className="font-medium text-gray-950">Conflicts</dt>
          <dd className="mt-1 text-orange-800">
            {validation.conflicts.length}
          </dd>
        </div>

        <div className="rounded-xl border border-orange-100 bg-white/70 p-4">
          <dt className="font-medium text-gray-950">Warnings</dt>
          <dd className="mt-1 text-orange-800">
            {validation.warnings.length}
          </dd>
        </div>
      </dl>
    </section>
  );
}
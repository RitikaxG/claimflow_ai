import { isValidationResultView } from "../../types/validation";

type ValidationSummaryCardProps = {
  validationJson: unknown | null;
};

export function ValidationSummaryCard({
  validationJson,
}: ValidationSummaryCardProps) {
  const validation = isValidationResultView(validationJson)
    ? validationJson
    : null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-gray-950">
          Validation summary
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Deterministic business-rule result produced after AI extraction.
        </p>
      </div>

      {!validation ? (
        <div className="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
          No validation result yet. Run validation after extraction completes.
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <div
            className={`rounded-xl border p-4 ${
              validation.finalStatus === "COMPLETED"
                ? "border-green-100 bg-green-50"
                : "border-orange-100 bg-orange-50"
            }`}
          >
            <p className="text-sm text-gray-600">Final status</p>
            <p className="mt-1 text-xl font-semibold text-gray-950">
              {validation.finalStatus.replace("_", " ")}
            </p>
          </div>

          <dl className="grid gap-4 text-sm sm:grid-cols-4">
            <div className="rounded-xl bg-gray-50 p-4">
              <dt className="text-gray-500">Valid</dt>
              <dd className="mt-1 font-semibold text-gray-950">
                {validation.isValid ? "Yes" : "No"}
              </dd>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <dt className="text-gray-500">Missing fields</dt>
              <dd className="mt-1 font-semibold text-gray-950">
                {validation.missingFields.length}
              </dd>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <dt className="text-gray-500">Conflicts</dt>
              <dd className="mt-1 font-semibold text-gray-950">
                {validation.conflicts.length}
              </dd>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <dt className="text-gray-500">Warnings</dt>
              <dd className="mt-1 font-semibold text-gray-950">
                {validation.warnings.length}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </section>
  );
}
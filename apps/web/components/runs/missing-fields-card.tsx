type MissingFieldsCardProps = {
  missingFieldsJson: unknown | null;
};

export function MissingFieldsCard({
  missingFieldsJson,
}: MissingFieldsCardProps) {
  const hasValidationRun = Array.isArray(missingFieldsJson);

  const missingFields = hasValidationRun
    ? missingFieldsJson.filter(
        (field): field is string => typeof field === "string",
      )
    : [];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-gray-950">
          Missing fields
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Required claim fields that were absent from the extracted data.
        </p>
      </div>

      {!hasValidationRun ? (
        <div className="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
          No missing-field result yet.
        </div>
      ) : missingFields.length === 0 ? (
        <div className="mt-5 rounded-xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">
          No missing required fields detected.
        </div>
      ) : (
        <ul className="mt-5 space-y-2">
          {missingFields.map((field) => (
            <li
              key={field}
              className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-800"
            >
              {field}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
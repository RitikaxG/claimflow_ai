type ExtractedJsonCardProps = {
  extractedJson: unknown | null;
};

export function ExtractedJsonCard({
  extractedJson,
}: ExtractedJsonCardProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-gray-950">
          Extracted JSON
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Structured claim data returned by Gemini and parsed by Zod.
        </p>
      </div>

      {!extractedJson ? (
        <div className="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
          No extraction output yet. Run extraction to generate structured
          JSON.
        </div>
      ) : (
        <pre className="mt-5 max-h-[520px] overflow-auto rounded-xl bg-gray-950 p-4 text-xs text-gray-50">
          {JSON.stringify(extractedJson, null, 2)}
        </pre>
      )}
    </section>
  );
}
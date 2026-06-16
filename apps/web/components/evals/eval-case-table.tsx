import { EvalStatusBadge } from "./eval-status-badge";

type CaseResult = {
  id: string;
  caseId: string;
  status: string;
  score: number | null;
  failureReason: string | null;
  metadataJson: unknown;
};

function titleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function humanizeCaseId(caseId: string) {
  return titleCase(
    caseId
      .replace(/^W3-COV-/i, "Week 3 coverage ")
      .replace(/^w(\d+)-/i, "Week $1 · ")
      .replaceAll("-", " "),
  )
    .replace(/\bPdf\b/g, "PDF")
    .replace(/\bOcr\b/g, "OCR")
    .replace(/\bJson\b/g, "JSON")
    .replace(/\bRag\b/g, "RAG");
}

function getTitle(metadataJson: unknown) {
  if (!metadataJson || typeof metadataJson !== "object" || Array.isArray(metadataJson)) {
    return null;
  }

  const title = (metadataJson as Record<string, unknown>).title;
  return typeof title === "string" ? title : null;
}

function getEvaluated(metadataJson: unknown) {
  if (!metadataJson || typeof metadataJson !== "object" || Array.isArray(metadataJson)) {
    return null;
  }

  const evaluated = (metadataJson as Record<string, unknown>).evaluated;
  return typeof evaluated === "string" ? evaluated : null;
}

export function EvalCaseTable({ cases }: { cases: CaseResult[] }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-950">Case results</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-5 py-3">Case</th>
              <th className="px-5 py-3">Title / evaluated basis</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Score</th>
              <th className="px-5 py-3">Failure</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {cases.map((item) => (
              <tr key={item.id}>
                <td className="px-5 py-4">
                  <div className="max-w-xs">
                    <p className="break-words font-semibold text-gray-950">
                      {humanizeCaseId(item.caseId)}
                    </p>
                    <p className="mt-1 break-words text-xs text-gray-500">
                      {item.caseId}
                    </p>
                  </div>
                </td>

                <td className="px-5 py-4 text-gray-600">
                  <div className="max-w-md">
                    <p className="font-medium text-gray-800">
                      {getTitle(item.metadataJson) ?? "-"}
                    </p>

                    {getEvaluated(item.metadataJson) ? (
                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        {getEvaluated(item.metadataJson)}
                      </p>
                    ) : null}
                  </div>
                </td>

                <td className="px-5 py-4">
                  <EvalStatusBadge status={item.status} />
                </td>

                <td className="px-5 py-4 text-gray-600">
                  {item.score === null ? "-" : `${(item.score * 100).toFixed(1)}%`}
                </td>

                <td className="px-5 py-4 text-gray-600">
                  <div className="max-w-md break-words">
                    {item.failureReason ?? "-"}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
import { EvalStatusBadge } from "./eval-status-badge";

type CaseResult = {
  id: string;
  caseId: string;
  status: string;
  score: number | null;
  failureReason: string | null;
  metadataJson: unknown;
};

function getTitle(metadataJson: unknown) {
  if (!metadataJson || typeof metadataJson !== "object" || Array.isArray(metadataJson)) {
    return null;
  }

  const title = (metadataJson as Record<string, unknown>).title;
  return typeof title === "string" ? title : null;
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
              <th className="px-5 py-3">Title</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Score</th>
              <th className="px-5 py-3">Failure</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {cases.map((item) => (
              <tr key={item.id}>
                <td className="px-5 py-4 font-medium text-gray-950">{item.caseId}</td>
                <td className="px-5 py-4 text-gray-600">{getTitle(item.metadataJson) ?? "-"}</td>
                <td className="px-5 py-4">
                  <EvalStatusBadge status={item.status} />
                </td>
                <td className="px-5 py-4 text-gray-600">
                  {item.score === null ? "-" : `${(item.score * 100).toFixed(1)}%`}
                </td>
                <td className="px-5 py-4 text-gray-600">{item.failureReason ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
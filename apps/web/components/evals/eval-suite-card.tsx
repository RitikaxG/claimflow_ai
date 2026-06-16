import Link from "next/link";

type EvalRun = {
  id: string;
  passRate: number;
  passedCases: number;
  failedCases: number;
  warningCases: number;
  totalCases: number;
  createdAt: string;
  metricsJson: unknown;
};

type Props = {
  title: string;
  description: string;
  latestRun: EvalRun | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function EvalSuiteCard({ title, description, latestRun }: Props) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-950">{title}</h2>
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        </div>

        {latestRun ? (
          <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
            {(latestRun.passRate * 100).toFixed(0)}%
          </span>
        ) : (
          <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
            No run
          </span>
        )}
      </div>

      {latestRun ? (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-gray-500">Passed</p>
              <p className="font-semibold text-gray-950">{latestRun.passedCases}</p>
            </div>
            <div>
              <p className="text-gray-500">Failed</p>
              <p className="font-semibold text-gray-950">{latestRun.failedCases}</p>
            </div>
            <div>
              <p className="text-gray-500">Warning</p>
              <p className="font-semibold text-gray-950">{latestRun.warningCases}</p>
            </div>
          </div>

          <p className="text-xs text-gray-500">Latest run: {formatDate(latestRun.createdAt)}</p>

          <Link
            href={`/evals/${latestRun.id}`}
            className="inline-flex rounded-lg bg-gray-950 px-4 py-2 text-sm font-medium text-white shadow-sm"
          >
            View details
          </Link>
        </div>
      ) : (
        <p className="mt-5 text-sm text-gray-500">
          Run this eval once to persist dashboard results.
        </p>
      )}
    </article>
  );
}
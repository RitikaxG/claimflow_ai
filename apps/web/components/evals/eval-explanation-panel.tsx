import { EVAL_SUITE_DETAILS } from "./eval-suite-details";

export function EvalExplanationPanel({ suite }: { suite: string }) {
  const detail = EVAL_SUITE_DETAILS[suite];

  if (!detail) return null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-950">
        What this eval proves
      </h2>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Evaluated
          </p>
          <p className="mt-2 text-sm text-gray-700">{detail.evaluated}</p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Pass basis
          </p>
          <p className="mt-2 text-sm text-gray-700">{detail.passBasis}</p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Why it matters
          </p>
          <p className="mt-2 text-sm text-gray-700">{detail.whyItMatters}</p>
        </div>
      </div>
    </section>
  );
}
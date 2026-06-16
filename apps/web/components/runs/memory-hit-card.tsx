import Link from "next/link";
import type { MemoryHitTraceRecord } from "../../lib/runs/run-trace-types";

export function MemoryHitCard({
  hit,
  runId,
}: {
  hit: MemoryHitTraceRecord;
  runId: string;
}) {
  return (
    <article className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">
          {hit.kind}
        </span>

        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-700">
          {hit.riskLevel} risk
        </span>

        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-700">
          score {hit.score}
        </span>

        {hit.usedByAgent ? (
          <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-800">
            Memory used by agent
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-sm font-semibold text-gray-950">{hit.summary}</p>

      <p className="mt-2 text-sm text-gray-700">
        <span className="font-semibold">Safe use:</span> {hit.safeUse}
      </p>

      {hit.mustNotDo.length > 0 ? (
        <p className="mt-2 text-sm text-red-700">
          <span className="font-semibold">Must not:</span>{" "}
          {hit.mustNotDo.slice(0, 2).join("; ")}
        </p>
      ) : null}

      <Link
        href={`/runs/${runId}/memory`}
        className="mt-3 inline-flex text-sm font-medium text-gray-950 underline underline-offset-4"
      >
        Open full memory audit
      </Link>
    </article>
  );
}
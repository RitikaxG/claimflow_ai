import { prisma } from "@repo/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

const demoRuns = [
  {
    id: "demo_run_complete",
    title: "Grounded claim completed",
    description: "Successful extraction, deterministic validation, policy evidence, gateway metadata, and a complete trace.",
  },
  {
    id: "demo_run_review",
    title: "Memory-guided human review",
    description: "A missing registration number retrieves safe workflow memory, triggers a guarded action, and stays in human review.",
  },
  {
    id: "demo_run_failure",
    title: "Safe model failure",
    description: "A synthetic provider timeout is classified as retryable and remains visible in the run-level trace.",
  },
];

export default async function DemoPage() {
  const [availableRuns, latestEval] = await Promise.all([
    prisma.extractionRun.findMany({
      where: { id: { in: demoRuns.map((run) => run.id) } },
      select: { id: true, status: true },
    }),
    prisma.evalRun.findFirst({
      where: { suite: "WEEK6_GATEWAY_OBSERVABILITY" },
      orderBy: { createdAt: "desc" },
      select: { id: true, passRate: true, totalCases: true, passedCases: true },
    }),
  ]);

  const statusById = new Map(availableRuns.map((run) => [run.id, run.status]));

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Portfolio demo</p>
          <h1 className="text-4xl font-semibold tracking-tight text-gray-950">ClaimFlow AI proof paths</h1>
          <p className="max-w-3xl text-base leading-7 text-gray-600">
            Explore three deterministic claims that prove the governed agentic workflow without spending model tokens or depending on a live provider response.
          </p>
          <nav className="flex flex-wrap gap-3 text-sm">
            <Link href="/dashboard" className="rounded-lg bg-gray-950 px-4 py-2 font-medium text-white">Open dashboard</Link>
            <Link href="/review" className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-medium text-gray-700">Open review queue</Link>
            <Link href="/evals" className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-medium text-gray-700">Open eval dashboard</Link>
          </nav>
        </header>

        {availableRuns.length === 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            Demo data has not been seeded. Run <code>bun run demo:seed</code> once against the deployed database.
          </div>
        ) : null}

        <section className="grid gap-5 md:grid-cols-3">
          {demoRuns.map((run) => {
            const status = statusById.get(run.id);
            return (
              <article key={run.id} className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4">
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">{status ?? "NOT SEEDED"}</span>
                </div>
                <h2 className="text-lg font-semibold text-gray-950">{run.title}</h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-gray-600">{run.description}</p>
                {status ? (
                  <div className="mt-5 flex gap-3 text-sm font-medium">
                    <Link href={`/runs/${run.id}`} className="text-indigo-700 underline underline-offset-4">Open run</Link>
                    <Link href={`/runs/${run.id}/trace`} className="text-gray-700 underline underline-offset-4">Open trace</Link>
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Week 6 gateway eval</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-semibold text-gray-950">{latestEval ? `${Math.round(latestEval.passRate * 100)}%` : "Not seeded"}</p>
              <p className="mt-1 text-sm text-gray-600">
                {latestEval ? `${latestEval.passedCases} of ${latestEval.totalCases} deterministic failure cases passed.` : "Seed the demo database to show evaluation evidence."}
              </p>
            </div>
            <Link href={latestEval ? `/evals/${latestEval.id}` : "/evals"} className="text-sm font-medium text-indigo-700 underline underline-offset-4">View evaluation evidence</Link>
          </div>
        </section>
      </div>
    </main>
  );
}

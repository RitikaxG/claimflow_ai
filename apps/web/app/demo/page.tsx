import { prisma } from "@repo/db";
import Link from "next/link";
import { AppShellButton, ClaimFlowAppShell } from "../../components/claimflow-app-shell";

export const dynamic = "force-dynamic";

const demoRuns = [
  {
    id: "demo_run_complete",
    title: "Grounded claim completed",
    description: "Successful extraction, deterministic validation, policy evidence, gateway metadata, and a complete trace.",
    accent: "border-[var(--cf-green)]",
  },
  {
    id: "demo_run_review",
    title: "Memory-guided human review",
    description: "A missing registration number retrieves safe workflow memory, triggers a guarded action, and stays in human review.",
    accent: "border-[var(--cf-indigo)]",
  },
  {
    id: "demo_run_failure",
    title: "Safe model failure",
    description: "A synthetic provider timeout is classified as retryable and remains visible in the run-level trace.",
    accent: "border-[var(--cf-red)]",
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
    <ClaimFlowAppShell
      active="demo"
      eyebrow="Portfolio proof paths"
      title="Open seeded claims that prove the full workflow."
      description="Use deterministic demo runs to explain ClaimFlow without depending on live model latency, provider availability, or manually created data."
      actions={
        <>
          <AppShellButton href="/dashboard">Create live run</AppShellButton>
          <AppShellButton href="/evals" variant="secondary">View evals</AppShellButton>
        </>
      }
    >
      {availableRuns.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
          Demo data has not been seeded. Run <code className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold">bun run demo:seed</code> once against the deployed database.
        </div>
      ) : null}

      <section className="grid gap-5 md:grid-cols-3">
        {demoRuns.map((run) => {
          const status = statusById.get(run.id);
          return (
            <article key={run.id} className={`cf-card flex flex-col rounded-2xl border-t-4 p-5 ${run.accent}`}>
              <div className="mb-4">
                <span className="rounded-full bg-[var(--cf-panel-muted)] px-3 py-1 text-xs font-bold text-[var(--cf-slate)]">{status ?? "NOT SEEDED"}</span>
              </div>
              <h2 className="text-lg font-semibold text-[var(--cf-navy)]">{run.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-[var(--cf-muted)]">{run.description}</p>
              {status ? (
                <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold">
                  <Link href={`/runs/${run.id}`} className="rounded-lg bg-[var(--cf-navy)] px-4 py-2 text-white">Open run</Link>
                  <Link href={`/runs/${run.id}/trace`} className="rounded-lg border border-[var(--cf-border)] px-4 py-2 text-[var(--cf-slate)]">Open trace</Link>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>

      <section className="cf-card rounded-2xl p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--cf-purple)]">Trace and eval proof</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--cf-navy)]">Gateway observability eval</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--cf-muted)]">
              Quality evidence is visible from the demo page instead of hidden in docs.
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--cf-panel-muted)] p-5 text-right">
            <p className="text-3xl font-semibold text-[var(--cf-navy)]">{latestEval ? `${Math.round(latestEval.passRate * 100)}%` : "Not seeded"}</p>
            <p className="mt-1 text-sm text-[var(--cf-muted)]">
              {latestEval ? `${latestEval.passedCases} of ${latestEval.totalCases} deterministic failure cases passed.` : "Seed the demo database to show evaluation evidence."}
            </p>
          </div>
        </div>
        <div className="mt-5">
          <Link href={latestEval ? `/evals/${latestEval.id}` : "/evals"} className="rounded-lg bg-[var(--cf-blue)] px-5 py-2.5 text-sm font-bold text-white shadow-sm">
            View evaluation evidence
          </Link>
        </div>
      </section>
    </ClaimFlowAppShell>
  );
}

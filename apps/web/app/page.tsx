import Link from "next/link";
import { ClaimFlowLogo } from "../components/claimflow-app-shell";

const workflowSteps = [
  { label: "Intake", detail: "PDF or claim email enters the workspace", color: "bg-[var(--cf-navy)]" },
  { label: "Extraction", detail: "Structured claim facts are produced", color: "bg-[var(--cf-cyan)]" },
  { label: "Validation", detail: "Required fields and evidence are checked", color: "bg-[var(--cf-amber)]" },
  { label: "Policy RAG", detail: "Relevant policy clauses ground coverage answers", color: "bg-[var(--cf-purple)]" },
  { label: "Memory", detail: "Safe prior workflow patterns are recalled", color: "bg-[var(--cf-indigo)]" },
  { label: "Agent", detail: "One guarded next action is recommended", color: "bg-[var(--cf-blue)]" },
  { label: "Human Review", detail: "Reviewer approves, edits, rejects, or asks for info", color: "bg-[var(--cf-green)]" },
  { label: "Trace + Evals", detail: "Every step stays observable and testable", color: "bg-[var(--cf-slate)]" },
];

const proofCards = [
  {
    title: "Architecture proof",
    description: "Shows how extraction, validation, RAG, memory, guarded agent actions, human review, traces, and evals connect as one product workflow.",
  },
  {
    title: "Trace proof",
    description: "Run-level traces make provider behavior, fallback decisions, and agent state transitions visible during the demo.",
  },
  {
    title: "Eval proof",
    description: "Synthetic gateway and workflow evals demonstrate that failure modes are measured instead of hidden behind a polished UI.",
  },
];

export default function HomePage() {
  return (
    <main className="cf-page-shell min-h-screen">
      <header className="border-b border-[var(--cf-border)] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <ClaimFlowLogo />
          <nav className="flex flex-wrap gap-2 text-sm">
            <Link href="/dashboard" className="rounded-full bg-[var(--cf-navy)] px-4 py-2 font-semibold text-white shadow-sm">Open demo workspace</Link>
            <Link href="/demo" className="rounded-full border border-[var(--cf-border)] px-4 py-2 font-semibold text-[var(--cf-slate)] hover:border-[var(--cf-blue)] hover:text-[var(--cf-blue)]">Guided proof paths</Link>
            <Link href="/evals" className="rounded-full border border-[var(--cf-border)] px-4 py-2 font-semibold text-[var(--cf-slate)] hover:border-[var(--cf-blue)] hover:text-[var(--cf-blue)]">View evals</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-16">
        <div className="space-y-8">
          <div className="space-y-5">
            <p className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-amber-800">
              Portfolio demonstration · no auth wall
            </p>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-[var(--cf-navy)] md:text-6xl">
                Governed agentic AI for motor-insurance claim workflows.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[var(--cf-muted)] md:text-lg">
                ClaimFlow AI follows one claim from intake to human decision: extract facts, validate missing evidence, retrieve policy clauses, recall safe workflow memory, recommend a guarded next action, and expose trace plus eval evidence.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="rounded-full bg-[var(--cf-blue)] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-900/20 transition hover:bg-blue-700">
              Open Claim Ops Dashboard
            </Link>
            <Link href="/demo" className="rounded-full border border-[var(--cf-border-strong)] bg-white px-6 py-3 text-sm font-bold text-[var(--cf-navy)] shadow-sm transition hover:border-[var(--cf-blue)] hover:text-[var(--cf-blue)]">
              Start Guided Demo
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {proofCards.map((card) => (
              <article key={card.title} className="cf-card rounded-3xl p-5">
                <h2 className="text-sm font-bold text-[var(--cf-navy)]">{card.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--cf-muted)]">{card.description}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="cf-dark-panel rounded-[2rem] p-5 shadow-2xl shadow-slate-900/15 md:p-6">
          <div className="rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-200">Live workflow map</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Motor claim journey</h2>
              </div>
              <span className="rounded-full bg-green-400/15 px-3 py-1 text-xs font-bold text-green-100">Human in control</span>
            </div>

            <div className="mt-5 space-y-3">
              {workflowSteps.map((step, index) => (
                <div key={step.label} className="flex gap-3 rounded-2xl border border-white/10 bg-white/8 p-3">
                  <div className="flex flex-col items-center gap-2">
                    <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-white ${step.color}`}>{index + 1}</span>
                    {index < workflowSteps.length - 1 ? <span className="h-6 w-px bg-white/20" /> : null}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{step.label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-200">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-14 lg:px-8">
        <div className="cf-card grid gap-6 rounded-[2rem] p-6 lg:grid-cols-[0.9fr_1.1fr] lg:p-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--cf-blue)]">Architecture at a glance</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--cf-navy)]">Built to prove the AI system, not a fake SaaS shell.</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--cf-muted)]">
              The frontend is intentionally demo-first: it explains the full AI workflow, gives direct access to seeded proof paths, and keeps review, trace, and eval evidence one click away.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "Deterministic validation before agent action",
              "Policy evidence retrieved through RAG",
              "Memory used as workflow guidance, not copied facts",
              "Human review required for final decisions",
              "Trace dashboard for every run",
              "Eval dashboard for measurable quality",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-[var(--cf-border)] bg-[var(--cf-panel-muted)] p-4 text-sm font-semibold text-[var(--cf-slate)]">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

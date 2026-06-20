import Link from "next/link";
import { ClaimFlowLogo } from "../components/claimflow-app-shell";

const productFlow = [
  {
    title: "1. Create a claim run",
    body: "Upload a PDF or paste a claim email. This starts the same workflow used throughout the demo.",
    href: "/dashboard",
    cta: "Open claims",
  },
  {
    title: "2. Inspect the run",
    body: "Open a claim to view extraction, validation, missing fields, coverage, memory, agent action, and trace links from one place.",
    href: "/dashboard",
    cta: "View runs",
  },
  {
    title: "3. Review the claim",
    body: "When validation creates a review task, the run page links directly to the matching human review screen.",
    href: "/review",
    cta: "Open review",
  },
  {
    title: "4. Prove behavior",
    body: "Use traces and evals to show what the AI did, what failed safely, and how the workflow is measured.",
    href: "/evals",
    cta: "Open evals",
  },
];

const capabilities = [
  "Extraction turns claim text into structured facts.",
  "Validation identifies missing fields and required evidence.",
  "Policy RAG grounds coverage answers in retrieved clauses.",
  "Memory recalls safe workflow patterns without copying old claim facts.",
  "Agent actions stay guarded and reviewable.",
  "Human review remains the final control point.",
];

export default function HomePage() {
  return (
    <main className="cf-page-shell min-h-screen">
      <header className="border-b border-[var(--cf-border)] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <ClaimFlowLogo />
          <nav className="flex flex-wrap gap-5 text-sm">
            <Link href="/dashboard" className="font-semibold text-[var(--cf-navy)]">Claims</Link>
            <Link href="/review" className="font-medium text-[var(--cf-muted)] hover:text-[var(--cf-navy)]">Review</Link>
            <Link href="/demo" className="font-medium text-[var(--cf-muted)] hover:text-[var(--cf-navy)]">Demo</Link>
            <Link href="/evals" className="font-medium text-[var(--cf-muted)] hover:text-[var(--cf-navy)]">Evals</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cf-muted)]">Portfolio project · motor insurance claims</p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[var(--cf-navy)] md:text-6xl">
            ClaimFlow AI explains a complete governed AI workflow.
          </h1>
          <p className="mt-6 text-lg leading-8 text-[var(--cf-muted)]">
            A minimal demo product for showing how extraction, validation, policy RAG, memory, guarded agent actions, human review, traces, and evals work together for one motor claim.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/dashboard" className="rounded-lg bg-[var(--cf-navy)] px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
              Open claims dashboard
            </Link>
            <Link href="/demo" className="rounded-lg border border-[var(--cf-border-strong)] bg-white px-5 py-3 text-sm font-semibold text-[var(--cf-navy)] hover:border-[var(--cf-navy)]">
              Use seeded demo
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="border-t border-[var(--cf-border)] pt-10">
          <div className="mb-8 max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--cf-navy)]">Product flow</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--cf-muted)]">
              The UI is organized around the path a reviewer should follow during a demo.
            </p>
          </div>

          <div className="space-y-4">
            {productFlow.map((step) => (
              <article key={step.title} className="cf-card flex flex-col gap-4 rounded-2xl p-5 md:flex-row md:items-center md:justify-between">
                <div className="max-w-3xl">
                  <h3 className="text-lg font-semibold text-[var(--cf-navy)]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--cf-muted)]">{step.body}</p>
                </div>
                <Link href={step.href} className="shrink-0 text-sm font-semibold text-[var(--cf-blue)] hover:underline">
                  {step.cta}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="border-t border-[var(--cf-border)] pt-10">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--cf-navy)]">What the demo proves</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {capabilities.map((item) => (
              <div key={item} className="rounded-2xl border border-[var(--cf-border)] bg-white p-4 text-sm leading-6 text-[var(--cf-slate)]">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
import { ClaimFlowLogo } from "../components/claimflow-app-shell";

const pillars = [
  ["EX", "Structured extraction", "Claim PDFs and emails become schema-shaped JSON with source, model, prompt, and run state preserved."],
  ["VA", "Validation boundary", "Missing fields, evidence, conflicts, warnings, and confidence issues become explicit workflow state."],
  ["RG", "Policy-grounded RAG", "Coverage answers are grounded in retrieved policy clauses instead of free-form guessing."],
  ["HR", "Human review", "Approval, rejection, correction, and missing-information handling stay with the reviewer."],
];

const workflow = ["Intake", "Extract", "Validate", "RAG", "Memory", "Agent", "Review", "Trace"];

const screens = [
  ["Claims dashboard", "/dashboard", "Create claim runs and open each case from a table."],
  ["Review queue", "/review", "Inspect tasks created by validation findings."],
  ["Guided demo", "/demo", "Use seeded claims for a predictable walkthrough."],
  ["Evals", "/evals", "Show measurement and reliability evidence."],
];

const stack = ["Next.js", "TypeScript", "Prisma", "Postgres", "pgvector", "Gemini", "RAG", "Memory", "Agent", "Evals"];

function SectionEyebrow({ children }: { children: ReactNode }) {
  return <p className="text-center text-xs font-semibold uppercase tracking-[0.28em] text-[var(--cf-blue)] sm:text-sm">{children}</p>;
}

function Badge({ children }: { children: ReactNode }) {
  return <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--cf-blue-soft)] text-sm font-bold text-[var(--cf-blue)]">{children}</div>;
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--cf-bg)] text-[var(--cf-text)]">
      <header className="sticky top-0 z-50 border-b border-[var(--cf-border)] bg-white/90 backdrop-blur">
        <div className="h-1 bg-gradient-to-r from-[var(--cf-navy)] via-[var(--cf-blue)] to-[var(--cf-amber)]" />
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12">
          <ClaimFlowLogo />
          <nav className="flex flex-wrap gap-2 text-sm">
            <a href="#architecture" className="rounded-full px-3 py-1.5 font-medium text-[var(--cf-muted)] hover:bg-[var(--cf-panel-muted)] hover:text-[var(--cf-navy)]">Architecture</a>
            <a href="#product" className="rounded-full px-3 py-1.5 font-medium text-[var(--cf-muted)] hover:bg-[var(--cf-panel-muted)] hover:text-[var(--cf-navy)]">Product</a>
            <Link href="/dashboard" className="rounded-full bg-[var(--cf-blue-soft)] px-3 py-1.5 font-semibold text-[var(--cf-blue)] ring-1 ring-blue-100">Open claims</Link>
          </nav>
        </div>
      </header>

      <section className="px-5 pb-12 pt-12 sm:px-8 lg:px-12 lg:pb-16 lg:pt-16">
        <div className="mx-auto max-w-7xl rounded-[32px] border border-[var(--cf-border)] bg-[#f9fcff] px-6 py-14 shadow-[0_16px_60px_rgba(15,39,66,0.07)] sm:px-8 lg:px-12">
          <div className="mx-auto max-w-5xl text-center">
            <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">• Motor-claim AI workflow demo</div>
            <h1 className="mx-auto mt-8 max-w-5xl text-4xl font-black tracking-tight text-[var(--cf-navy)] sm:text-5xl lg:text-6xl lg:leading-tight">Turn incomplete claims into policy-grounded, human-reviewed cases</h1>
            <p className="mx-auto mt-6 max-w-4xl text-lg leading-8 text-[var(--cf-muted)] sm:text-xl sm:leading-9">ClaimFlow AI connects extraction, validation, policy retrieval, workflow memory, agent actions, human review, traces, and evals into one auditable product loop.</p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/dashboard" className="rounded-[18px] bg-[var(--cf-navy)] px-8 py-4 text-base font-semibold text-white shadow-[0_16px_30px_rgba(15,39,66,0.18)] transition hover:bg-[var(--cf-navy-soft)]">Open claims dashboard</Link>
              <Link href="/demo" className="rounded-[18px] border border-[var(--cf-border-strong)] bg-white px-8 py-4 text-base font-semibold text-[var(--cf-navy)] transition hover:border-[var(--cf-blue)] hover:text-[var(--cf-blue)]">Use seeded demo</Link>
            </div>
            <div className="mx-auto mt-12 flex max-w-5xl flex-wrap items-center justify-center gap-3">
              {stack.map((item) => <span key={item} className="rounded-full border border-[var(--cf-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--cf-muted)]">{item}</span>)}
            </div>
          </div>

          <div className="mx-auto mt-14 grid max-w-7xl gap-6 lg:grid-cols-2">
            {pillars.map(([badge, title, body]) => (
              <article key={title} className="rounded-[28px] border border-[var(--cf-border)] bg-white p-7 shadow-sm sm:p-8">
                <Badge>{badge}</Badge>
                <h2 className="mt-6 text-2xl font-bold tracking-tight text-[var(--cf-navy)]">{title}</h2>
                <p className="mt-4 text-base leading-8 text-[var(--cf-muted)]">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="architecture" className="px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
        <div className="mx-auto max-w-7xl rounded-[32px] border border-[var(--cf-border)] bg-white px-6 py-14 shadow-sm sm:px-8 lg:px-12">
          <SectionEyebrow>Workflow architecture</SectionEyebrow>
          <h2 className="mx-auto mt-6 max-w-5xl text-center text-3xl font-black tracking-tight text-[var(--cf-navy)] sm:text-4xl lg:text-5xl">One claim moves through every AI and control layer</h2>
          <div className="mt-12 rounded-[30px] border border-[var(--cf-border)] bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-6 shadow-sm sm:p-8 lg:p-10">
            <div className="grid gap-4 xl:grid-cols-8">
              {workflow.map((item, index) => (
                <div key={item} className="relative rounded-[22px] border border-[var(--cf-border)] bg-white p-5 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--cf-blue)]">{String(index + 1).padStart(2, "0")}</div>
                  <div className="mt-4 text-lg font-bold text-[var(--cf-navy)]">{item}</div>
                  {index < workflow.length - 1 ? <div className="pointer-events-none hidden xl:block"><div className="absolute right-[-20px] top-1/2 h-[2px] w-10 -translate-y-1/2 bg-gradient-to-r from-blue-200 to-transparent" /><div className="absolute right-[-10px] top-1/2 -translate-y-1/2 text-blue-400">→</div></div> : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="product" className="px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
        <div className="mx-auto max-w-7xl rounded-[32px] border border-[var(--cf-border)] bg-[#f9fcff] px-6 py-14 shadow-sm sm:px-8 lg:px-12">
          <SectionEyebrow>Product screens</SectionEyebrow>
          <h2 className="mx-auto mt-6 max-w-5xl text-center text-3xl font-black tracking-tight text-[var(--cf-navy)] sm:text-4xl lg:text-5xl">Every screen exists to explain the claim workflow</h2>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {screens.map(([title, href, body]) => (
              <Link key={title} href={href} className="rounded-[28px] border border-[var(--cf-border)] bg-white p-7 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--cf-blue)] sm:p-8">
                <h3 className="text-xl font-bold text-[var(--cf-navy)]">{title}</h3>
                <p className="mt-4 text-base leading-8 text-[var(--cf-muted)]">{body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--cf-border)] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-10 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12">
          <ClaimFlowLogo />
          <p className="text-sm text-[var(--cf-muted)]">Portfolio demonstration. Auth is intentionally omitted so the workflow is immediately visible.</p>
        </div>
      </footer>
    </main>
  );
}

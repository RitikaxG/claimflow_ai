import Link from "next/link";
import { ClaimFlowLogo } from "../components/claimflow-app-shell";

const journey = [
  ["Intake", "Upload a claim PDF or paste a claim email."],
  ["Extract", "Convert unstructured text into schema-shaped claim JSON."],
  ["Validate", "Find missing fields, required evidence, conflicts, and warnings."],
  ["Ground", "Use policy RAG to retrieve relevant coverage clauses."],
  ["Guide", "Use safe workflow memory without copying old claim facts."],
  ["Review", "Keep approval, correction, rejection, and info requests human-owned."],
  ["Trace", "Inspect gateway calls, agent actions, review events, and evals."],
];

const valueCards = [
  {
    title: "Not a chatbot",
    body: "The UI follows a claim through a governed workflow. The model interprets and proposes; deterministic code validates and constrains.",
  },
  {
    title: "Policy-grounded",
    body: "Coverage answers come from retrieved policy clauses, with weak evidence routed to review instead of confident guessing.",
  },
  {
    title: "Human controlled",
    body: "The reviewer owns approval, rejection, correction, and missing-information decisions. The agent cannot silently finalize a claim.",
  },
  {
    title: "Auditable",
    body: "Original extraction, corrected JSON, memory feedback, gateway metadata, traces, and evals remain visible as evidence.",
  },
];

const proofLinks = [
  ["Open claims", "/dashboard", "Create a live claim run from PDF or email text."],
  ["Open review", "/review", "Review tasks created by validation failures."],
  ["Seeded demo", "/demo", "Use deterministic proof paths for portfolio walkthroughs."],
  ["Evals", "/evals", "Show quality and observability evidence."],
];

export default function HomePage() {
  return (
    <main className="cf-page-shell min-h-screen">
      <header className="border-b border-[var(--cf-border)] bg-white/92 backdrop-blur">
        <div className="h-1 bg-gradient-to-r from-[var(--cf-navy)] via-[var(--cf-blue)] to-[var(--cf-amber)]" />
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <ClaimFlowLogo />
          <nav className="flex flex-wrap gap-2 text-sm">
            <Link href="/dashboard" className="rounded-full bg-[var(--cf-blue-soft)] px-3 py-1.5 font-semibold text-[var(--cf-blue)] ring-1 ring-blue-100">Claims</Link>
            <Link href="/review" className="rounded-full px-3 py-1.5 font-medium text-[var(--cf-muted)] hover:bg-[var(--cf-panel-muted)] hover:text-[var(--cf-navy)]">Review</Link>
            <Link href="/demo" className="rounded-full px-3 py-1.5 font-medium text-[var(--cf-muted)] hover:bg-[var(--cf-panel-muted)] hover:text-[var(--cf-navy)]">Demo</Link>
            <Link href="/evals" className="rounded-full px-3 py-1.5 font-medium text-[var(--cf-muted)] hover:bg-[var(--cf-panel-muted)] hover:text-[var(--cf-navy)]">Evals</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cf-blue)]">Motor insurance · governed AI workflow</p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[var(--cf-navy)] md:text-6xl">
            Turn an incomplete claim into a policy-grounded, human-reviewed case.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--cf-muted)]">
            ClaimFlow AI shows how extraction, validation, RAG, memory, a guarded agent, human review, observability, and evals can work as one reliable product instead of separate AI demos.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/dashboard" className="rounded-lg bg-[var(--cf-navy)] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[var(--cf-navy-soft)]">
              Open claims dashboard
            </Link>
            <Link href="/demo" className="rounded-lg border border-[var(--cf-border-strong)] bg-white px-5 py-3 text-sm font-semibold text-[var(--cf-navy)] hover:border-[var(--cf-blue)] hover:text-[var(--cf-blue)]">
              Use seeded demo
            </Link>
          </div>
        </div>

        <div className="cf-card rounded-3xl p-5">
          <div className="border-b border-[var(--cf-border)] pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--cf-muted)]">Product flow</p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--cf-navy)]">One claim, end to end</h2>
          </div>
          <div className="mt-5 space-y-4">
            {journey.map(([title, body], index) => (
              <div key={title} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--cf-blue-soft)] text-xs font-semibold text-[var(--cf-blue)] ring-1 ring-blue-100">
                    {index + 1}
                  </span>
                  {index < journey.length - 1 ? <span className="mt-2 h-full w-px bg-[var(--cf-border)]" /> : null}
                </div>
                <div className="pb-1">
                  <p className="text-sm font-semibold text-[var(--cf-navy)]">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--cf-muted)]">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="border-t border-[var(--cf-border)] pt-10">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--cf-navy)]">What ClaimFlow provides</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {valueCards.map((card) => (
              <article key={card.title} className="cf-card rounded-2xl p-5">
                <h3 className="text-base font-semibold text-[var(--cf-navy)]">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--cf-muted)]">{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="grid gap-4 rounded-3xl border border-[var(--cf-border)] bg-white p-6 md:grid-cols-4">
          {proofLinks.map(([title, href, body]) => (
            <Link key={title} href={href} className="rounded-2xl border border-[var(--cf-border)] bg-[var(--cf-panel-muted)] p-4 transition hover:border-[var(--cf-blue)] hover:bg-white">
              <p className="text-sm font-semibold text-[var(--cf-blue)]">{title}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--cf-muted)]">{body}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

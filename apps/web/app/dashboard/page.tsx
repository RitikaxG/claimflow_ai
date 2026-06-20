import { AppShellButton, ClaimFlowAppShell } from "../../components/claimflow-app-shell";
import { EmailTextCard } from "../../components/dashboard/email-text-card";
import { RecentRunsList } from "../../components/dashboard/recent-runs-list";
import { UploadPdfCard } from "../../components/dashboard/upload-pdf-card";

const operationCards = [
  {
    label: "Claim intake",
    value: "PDF + email",
    detail: "Create a durable run from uploaded forms or pasted claim text.",
    color: "border-[var(--cf-cyan)]",
  },
  {
    label: "Review control",
    value: "Human gated",
    detail: "AI can recommend next actions, but final claim movement stays reviewable.",
    color: "border-[var(--cf-green)]",
  },
  {
    label: "Policy evidence",
    value: "RAG grounded",
    detail: "Coverage answers should point back to retrieved policy clauses.",
    color: "border-[var(--cf-purple)]",
  },
  {
    label: "Trace + evals",
    value: "Observable",
    detail: "Run traces and eval evidence are first-class demo artifacts.",
    color: "border-[var(--cf-slate)]",
  },
];

export default function DashboardPage() {
  return (
    <ClaimFlowAppShell
      active="dashboard"
      eyebrow="Claim operations workspace"
      title="Run a motor claim through the complete AI workflow."
      description="Start from a claim PDF or email, then inspect extraction, validation, policy RAG, workflow memory, guarded agent actions, human review, traces, and eval evidence."
      actions={
        <>
          <AppShellButton href="/demo">Open guided demo</AppShellButton>
          <AppShellButton href="/evals" variant="secondary">View eval proof</AppShellButton>
        </>
      }
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {operationCards.map((card) => (
          <article key={card.label} className={`cf-card rounded-3xl border-l-4 p-5 ${card.color}`}>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--cf-muted)]">{card.label}</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--cf-navy)]">{card.value}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--cf-muted)]">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-1">
          <UploadPdfCard />
          <EmailTextCard />
        </div>

        <aside className="cf-card overflow-hidden rounded-[2rem]">
          <div className="cf-dark-panel p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-200">Architecture proof</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">One claim, eight visible AI/control layers.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-200">
              The demo is structured so reviewers can see where deterministic checks stop, where RAG and memory inform the agent, and where human approval remains mandatory.
            </p>
          </div>
          <div className="space-y-3 p-5">
            {[
              ["01", "Extraction", "Claim facts become structured data."],
              ["02", "Validation", "Missing required evidence is surfaced."],
              ["03", "Policy RAG", "Coverage answers cite retrieved clauses."],
              ["04", "Memory", "Prior safe workflow patterns guide the next step."],
              ["05", "Guarded agent", "Only a reviewable action is recommended."],
              ["06", "Trace + evals", "Behavior is inspected after the run."],
            ].map(([number, title, body]) => (
              <div key={title} className="flex gap-3 rounded-2xl border border-[var(--cf-border)] bg-[var(--cf-panel-muted)] p-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--cf-navy)] text-xs font-bold text-white">{number}</span>
                <div>
                  <p className="text-sm font-semibold text-[var(--cf-navy)]">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--cf-muted)]">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <RecentRunsList />
    </ClaimFlowAppShell>
  );
}

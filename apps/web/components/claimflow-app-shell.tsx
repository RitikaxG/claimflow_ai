import Link from "next/link";
import type { ReactNode } from "react";

type AppSection = "dashboard" | "demo" | "review" | "evals";

type ClaimFlowAppShellProps = {
  active: AppSection;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  actions?: ReactNode;
};

const navItems: Array<{ href: string; label: string; section: AppSection; detail: string }> = [
  { href: "/dashboard", label: "Claim Ops", section: "dashboard", detail: "intake + runs" },
  { href: "/demo", label: "Guided Demo", section: "demo", detail: "seeded proofs" },
  { href: "/review", label: "Human Review", section: "review", detail: "approval control" },
  { href: "/evals", label: "Evals", section: "evals", detail: "quality evidence" },
];

const workflowLayers = [
  ["Intake", "bg-[var(--cf-navy)]"],
  ["Extraction", "bg-[var(--cf-cyan)]"],
  ["Validation", "bg-[var(--cf-amber)]"],
  ["Policy RAG", "bg-[var(--cf-purple)]"],
  ["Memory", "bg-[var(--cf-indigo)]"],
  ["Agent", "bg-[var(--cf-blue)]"],
  ["Human", "bg-[var(--cf-green)]"],
  ["Trace", "bg-[var(--cf-slate)]"],
];

export function ClaimFlowLogo() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <div className="relative grid h-11 w-11 place-items-center rounded-2xl bg-[var(--cf-navy)] text-white shadow-lg shadow-slate-900/10">
        <div className="absolute inset-x-2 top-3 h-0.5 rounded-full bg-[var(--cf-road)]" />
        <div className="absolute inset-x-3 bottom-3 h-0.5 rounded-full bg-[var(--cf-road)]" />
        <span className="text-sm font-black tracking-tight">CF</span>
      </div>
      <div>
        <p className="text-sm font-bold tracking-tight text-[var(--cf-navy)]">ClaimFlow AI</p>
        <p className="text-xs text-[var(--cf-muted)]">Motor claim command center</p>
      </div>
    </Link>
  );
}

export function ClaimFlowTopNav({ active }: { active: AppSection }) {
  return (
    <header className="border-b border-[var(--cf-border)] bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <ClaimFlowLogo />
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link href="/" className="rounded-full border border-[var(--cf-border)] px-4 py-2 font-semibold text-[var(--cf-slate)] transition hover:border-[var(--cf-blue)] hover:text-[var(--cf-blue)]">Product Story</Link>
          {navItems.map((item) => {
            const isActive = active === item.section;
            return (
              <Link key={item.href} href={item.href} className={isActive ? "rounded-full bg-[var(--cf-navy)] px-4 py-2 font-semibold text-white shadow-sm" : "rounded-full border border-[var(--cf-border)] px-4 py-2 font-semibold text-[var(--cf-slate)] transition hover:border-[var(--cf-blue)] hover:text-[var(--cf-blue)]"}>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

export function ClaimFlowSidebar({ active }: { active: AppSection }) {
  return (
    <aside className="hidden w-72 shrink-0 lg:block">
      <div className="sticky top-6 space-y-5 rounded-[2rem] border border-[var(--cf-border)] bg-white/90 p-4 shadow-xl shadow-slate-900/5 backdrop-blur">
        <div className="rounded-3xl bg-[var(--cf-panel-muted)] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--cf-muted)]">Demo workspace</p>
          <p className="mt-2 text-sm leading-6 text-[var(--cf-slate)]">No sign-in wall. The portfolio proof is the governed AI workflow, review loop, trace, and eval evidence.</p>
        </div>
        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive = active === item.section;
            return (
              <Link key={item.href} href={item.href} className={isActive ? "block rounded-2xl border border-[var(--cf-blue)] bg-blue-50 px-4 py-3 text-sm shadow-sm" : "block rounded-2xl border border-transparent px-4 py-3 text-sm transition hover:border-[var(--cf-border)] hover:bg-[var(--cf-panel-muted)]"}>
                <span className="font-semibold text-[var(--cf-navy)]">{item.label}</span>
                <span className="mt-1 block text-xs text-[var(--cf-muted)]">{item.detail}</span>
              </Link>
            );
          })}
        </nav>
        <div className="space-y-3 rounded-3xl border border-[var(--cf-border)] bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--cf-muted)]">Workflow colors</p>
          <div className="grid grid-cols-2 gap-2">
            {workflowLayers.map(([label, color]) => (
              <div key={label} className="flex items-center gap-2 text-xs text-[var(--cf-slate)]">
                <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

export function ClaimFlowAppShell({ active, eyebrow, title, description, actions, children }: ClaimFlowAppShellProps) {
  return (
    <div className="cf-page-shell">
      <ClaimFlowTopNav active={active} />
      <main className="mx-auto flex max-w-7xl gap-8 px-5 py-8 lg:px-8">
        <ClaimFlowSidebar active={active} />
        <section className="min-w-0 flex-1 space-y-8">
          <header className="cf-dark-panel overflow-hidden rounded-[2rem] p-6 shadow-2xl shadow-slate-900/10 md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-200">{eyebrow}</p>
                <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">{title}</h1>
                <p className="text-sm leading-6 text-slate-200 md:text-base">{description}</p>
              </div>
              {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
            </div>
          </header>
          {children}
        </section>
      </main>
    </div>
  );
}

export function AppShellButton({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" }) {
  return (
    <Link href={href} className={variant === "primary" ? "rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[var(--cf-navy)] shadow-sm transition hover:bg-blue-50" : "rounded-full border border-white/25 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"}>
      {children}
    </Link>
  );
}

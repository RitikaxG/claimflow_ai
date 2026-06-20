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

const navItems: Array<{ href: string; label: string; section: AppSection }> = [
  { href: "/dashboard", label: "Claims", section: "dashboard" },
  { href: "/review", label: "Review", section: "review" },
  { href: "/demo", label: "Demo", section: "demo" },
  { href: "/evals", label: "Evals", section: "evals" },
];

export function ClaimFlowLogo() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--cf-navy)] text-xs font-bold text-white shadow-sm">
        CF
      </div>
      <div>
        <p className="text-sm font-semibold tracking-tight text-[var(--cf-navy)]">ClaimFlow AI</p>
        <p className="text-xs text-[var(--cf-muted)]">Motor claims workflow</p>
      </div>
    </Link>
  );
}

export function ClaimFlowTopNav({ active }: { active: AppSection }) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--cf-border)] bg-white/92 backdrop-blur">
      <div className="h-1 bg-gradient-to-r from-[var(--cf-navy)] via-[var(--cf-blue)] to-[var(--cf-amber)]" />
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <ClaimFlowLogo />
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link href="/" className="rounded-full px-3 py-1.5 font-medium text-[var(--cf-muted)] transition hover:bg-[var(--cf-panel-muted)] hover:text-[var(--cf-navy)]">
            Home
          </Link>
          {navItems.map((item) => {
            const isActive = active === item.section;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive
                    ? "rounded-full bg-[var(--cf-blue-soft)] px-3 py-1.5 font-semibold text-[var(--cf-blue)] ring-1 ring-blue-100"
                    : "rounded-full px-3 py-1.5 font-medium text-[var(--cf-muted)] transition hover:bg-[var(--cf-panel-muted)] hover:text-[var(--cf-navy)]"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

export function ClaimFlowAppShell({ active, eyebrow, title, description, actions, children }: ClaimFlowAppShellProps) {
  return (
    <div className="cf-page-shell">
      <ClaimFlowTopNav active={active} />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <header className="mb-8 flex flex-col gap-5 border-b border-[var(--cf-border)] pb-6 md:flex-row md:items-end md:justify-between">
          <div className="cf-section-accent max-w-3xl pl-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--cf-blue)]">{eyebrow}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--cf-navy)] md:text-4xl">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--cf-muted)] md:text-base">{description}</p>
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </header>
        <section className="space-y-8">{children}</section>
      </main>
    </div>
  );
}

export function AppShellButton({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" }) {
  return (
    <Link
      href={href}
      className={
        variant === "primary"
          ? "rounded-lg bg-[var(--cf-navy)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--cf-navy-soft)]"
          : "rounded-lg border border-[var(--cf-border-strong)] bg-white px-4 py-2 text-sm font-semibold text-[var(--cf-navy)] transition hover:border-[var(--cf-blue)] hover:text-[var(--cf-blue)]"
      }
    >
      {children}
    </Link>
  );
}

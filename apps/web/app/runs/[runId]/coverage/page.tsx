import { ClaimCoverageScreen } from "../../../../components/runs/claim-coverage-screen";

export default function RunCoveragePage() {
  return (
    <main className="cf-page-shell min-h-screen px-5 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="border-b border-[var(--cf-border)] pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--cf-muted)]">Coverage</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--cf-navy)]">Coverage</h1>
        </header>
        <ClaimCoverageScreen />
      </div>
    </main>
  );
}

import { RunTraceDetailScreen } from "../../../../components/runs/run-trace-detail-screen";

export default function RunTracePage() {
  return (
    <main className="cf-page-shell min-h-screen px-5 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="border-b border-[var(--cf-border)] pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--cf-muted)]">Trace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--cf-navy)]">Run trace</h1>
        </header>
        <RunTraceDetailScreen />
      </div>
    </main>
  );
}

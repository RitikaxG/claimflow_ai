import { RunDetailScreen } from "../../../components/runs/run-detail-screen";

export default function RunDetailPage() {
  return (
    <main className="cf-page-shell min-h-screen px-5 py-8 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="cf-dark-panel rounded-[2rem] p-6 shadow-2xl shadow-slate-900/10">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-200">Claim run detail</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Single-claim workflow evidence</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">Inspect extraction, validation, coverage, memory, review state, and trace links for this motor claim run.</p>
        </header>
        <RunDetailScreen />
      </div>
    </main>
  );
}

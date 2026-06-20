import { RunMemoryDetailScreen } from "../../../../components/memory/run-memory-detail-screen";

export default function RunMemoryPage() {
  return (
    <main className="cf-page-shell min-h-screen px-5 py-8 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="cf-dark-panel rounded-[2rem] p-6 shadow-2xl shadow-slate-900/10">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-200">Memory layer</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Memory workspace</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">Inspect retrieved workflow guidance for this claim run.</p>
        </header>
        <RunMemoryDetailScreen />
      </div>
    </main>
  );
}

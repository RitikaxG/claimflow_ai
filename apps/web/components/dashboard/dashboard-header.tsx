import Link from "next/link";

export function DashboardHeader() {
  return (
    <header className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium text-indigo-600">Governed agentic claims workflow</p>
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-950">ClaimFlow AI</h1>
          <p className="max-w-3xl text-sm leading-6 text-gray-600">
            Extract and validate claims, retrieve policy evidence and safe workflow memory, run guarded agent actions, route decisions to humans, and inspect every step through traces and evals.
          </p>
        </div>
      </div>

      <nav className="flex flex-wrap gap-3 text-sm">
        <Link href="/dashboard" className="rounded-lg bg-gray-950 px-4 py-2 font-medium text-white shadow-sm">Dashboard</Link>
        <Link href="/demo" className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 font-medium text-indigo-700 shadow-sm hover:bg-indigo-100">Portfolio Demo</Link>
        <Link href="/review" className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 shadow-sm hover:bg-gray-50">Review Queue</Link>
        <Link href="/evals" className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 shadow-sm hover:bg-gray-50">Eval Dashboard</Link>
      </nav>
    </header>
  );
}

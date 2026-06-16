import Link from "next/link";

export function DashboardHeader() {
  return (
    <header className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-500">
          Week 1 · Document Intake Reviewer
        </p>

        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-950">
            ClaimFlow AI
          </h1>
          <p className="max-w-2xl text-sm text-gray-600">
            Upload claim documents or paste email text to create an extraction
            run and start a traceable document-intake workflow.
          </p>
        </div>
      </div>

      <nav className="flex gap-3 text-sm">
        <Link
          href="/dashboard"
          className="rounded-lg bg-gray-950 px-4 py-2 font-medium text-white shadow-sm"
        >
          Dashboard
        </Link>

        <Link
          href="/review"
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Review Queue
        </Link>

        <Link
          href="/evals"
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Eval Dashboard
        </Link>
      </nav>
    </header>
  );
}
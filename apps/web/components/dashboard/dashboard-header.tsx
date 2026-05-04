export function DashboardHeader() {
  return (
    <header className="space-y-2">
      <p className="text-sm font-medium text-gray-500">
        Week 1 · Document Intake Reviewer
      </p>

      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-950">
          ClaimFlow AI
        </h1>
        <p className="max-w-2xl text-sm text-gray-600">
          Upload claim documents or paste email text to create an extraction run
          and start a traceable document-intake workflow.
        </p>
      </div>
    </header>
  );
}
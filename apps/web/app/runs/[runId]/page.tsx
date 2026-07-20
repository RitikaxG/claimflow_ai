import { Suspense } from "react";
import { RunDetailScreen } from "../../../components/runs/run-detail-screen";

export default function RunDetailPage() {
  return (
    <Suspense fallback={<ClaimWorkspaceLoadingState />}>
      <RunDetailScreen />
    </Suspense>
  );
}

function ClaimWorkspaceLoadingState() {
  return (
    <main className="min-h-screen bg-[#fbfaf6]">
      <div className="mx-auto max-w-6xl px-5 py-12 text-sm text-[#667571]">
        Loading claim workspace…
      </div>
    </main>
  );
}

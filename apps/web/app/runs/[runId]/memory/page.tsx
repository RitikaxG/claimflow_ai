import { ClaimFlowTopNav } from "../../../../components/claimflow-app-shell";
import { RunMemoryDetailScreen } from "../../../../components/memory/run-memory-detail-screen";

export default function RunMemoryPage() {
  return (
    <main className="cf-page-shell min-h-screen">
      <ClaimFlowTopNav active="dashboard" />
      <div className="mx-auto max-w-6xl px-5 py-8">
        <RunMemoryDetailScreen />
      </div>
    </main>
  );
}

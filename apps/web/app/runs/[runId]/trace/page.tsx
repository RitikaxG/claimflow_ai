import { ClaimFlowTopNav } from "../../../../components/claimflow-app-shell";
import { RunTraceDetailScreen } from "../../../../components/runs/run-trace-detail-screen";

export default function RunTracePage() {
  return (
    <main className="cf-page-shell min-h-screen">
      <ClaimFlowTopNav active="dashboard" />
      <div className="mx-auto max-w-6xl px-5 py-8">
        <RunTraceDetailScreen />
      </div>
    </main>
  );
}

import { ClaimFlowTopNav } from "../../../components/claimflow-app-shell";
import { RunDetailScreen } from "../../../components/runs/run-detail-screen";

export default function RunDetailPage() {
  return (
    <main className="cf-page-shell min-h-screen">
      <ClaimFlowTopNav active="dashboard" />
      <div className="mx-auto max-w-6xl px-5 py-8">
        <RunDetailScreen />
      </div>
    </main>
  );
}

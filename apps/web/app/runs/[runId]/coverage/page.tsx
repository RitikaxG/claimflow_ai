import { ClaimFlowTopNav } from "../../../../components/claimflow-app-shell";
import { ClaimCoverageScreen } from "../../../../components/runs/claim-coverage-screen";

export default function RunCoveragePage() {
  return (
    <main className="cf-page-shell min-h-screen">
      <ClaimFlowTopNav active="dashboard" />
      <div className="mx-auto max-w-6xl px-5 py-8">
        <ClaimCoverageScreen />
      </div>
    </main>
  );
}

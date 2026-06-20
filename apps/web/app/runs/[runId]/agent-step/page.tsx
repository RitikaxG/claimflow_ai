import { ClaimFlowTopNav } from "../../../../components/claimflow-app-shell";
import { RunAgentStepScreen } from "../../../../components/runs/run-agent-step-screen";

export default function RunAgentStepPage() {
  return (
    <main className="cf-page-shell min-h-screen">
      <ClaimFlowTopNav active="dashboard" />
      <div className="mx-auto max-w-6xl px-5 py-8">
        <RunAgentStepScreen />
      </div>
    </main>
  );
}

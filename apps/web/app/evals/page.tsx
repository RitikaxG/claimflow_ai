import { AppShellButton, ClaimFlowAppShell } from "../../components/claimflow-app-shell";
import { EvalDashboardScreen } from "../../components/evals/eval-dashboard-screen";

export default function EvalsPage() {
  return (
    <ClaimFlowAppShell
      active="evals"
      eyebrow="Evaluation and observability proof"
      title="Show that ClaimFlow measures AI workflow quality."
      description="The eval dashboard is presented as evidence for gateway behavior, trace visibility, and workflow reliability across deterministic synthetic cases."
      actions={
        <>
          <AppShellButton href="/demo">Guided demo</AppShellButton>
          <AppShellButton href="/dashboard" variant="secondary">Claim ops</AppShellButton>
        </>
      }
    >
      <EvalDashboardScreen />
    </ClaimFlowAppShell>
  );
}

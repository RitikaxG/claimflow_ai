import { AppShellButton, ClaimFlowAppShell } from "../../components/claimflow-app-shell";
import { ReviewQueueList } from "../../components/review/review-queue-list";

export default function ReviewQueuePage() {
  return (
    <ClaimFlowAppShell
      active="review"
      eyebrow="Human-in-the-loop control"
      title="Review AI-created claim tasks before the workflow moves."
      description="Validation failures and guarded agent recommendations appear here so a human can approve, edit, reject, or request missing information."
      actions={
        <>
          <AppShellButton href="/dashboard">Claim ops</AppShellButton>
          <AppShellButton href="/evals" variant="secondary">Eval evidence</AppShellButton>
        </>
      }
    >
      <ReviewQueueList />
    </ClaimFlowAppShell>
  );
}

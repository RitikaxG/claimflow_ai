import { ClaimFlowAppShell } from "../../components/claimflow-app-shell";
import { EmailTextCard } from "../../components/dashboard/email-text-card";
import { RecentRunsList } from "../../components/dashboard/recent-runs-list";
import { UploadPdfCard } from "../../components/dashboard/upload-pdf-card";

export default function DashboardPage() {
  return (
    <ClaimFlowAppShell
      active="dashboard"
      eyebrow="Claims"
      title="Create and open claim runs."
      description="Start with a PDF or claim email, then open a run to continue through extraction, validation, coverage, memory, agent action, review, trace, and eval evidence."
    >
      <section className="grid gap-5 md:grid-cols-2">
        <UploadPdfCard />
        <EmailTextCard />
      </section>

      <RecentRunsList />
    </ClaimFlowAppShell>
  );
}

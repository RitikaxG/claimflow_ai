import { DashboardHeader } from "../../components/dashboard/dashboard-header";
import { EmailTextCard } from "../../components/dashboard/email-text-card";
import { RecentRunsList } from "../../components/dashboard/recent-runs-list";
import { UploadPdfCard } from "../../components/dashboard/upload-pdf-card";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <DashboardHeader />

        <div className="grid gap-6 lg:grid-cols-2">
          <UploadPdfCard />
          <EmailTextCard />
        </div>

        <RecentRunsList />
      </div>
    </main>
  );
}
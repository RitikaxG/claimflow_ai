"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useDashboardStore } from "../../store/use-dashboard-store";
import { NeedsAttentionWorkspace } from "./needs-attention-workspace";

export function RunDetailScreen() {
  const params = useParams<{ runId: string }>();

  const selectedRun = useDashboardStore((state) => state.selectedRun);
  const isFetchingRun = useDashboardStore((state) => state.isFetchingRun);
  const error = useDashboardStore((state) => state.error);
  const fetchRun = useDashboardStore((state) => state.fetchRun);

  useEffect(() => {
    if (params.runId) {
      void fetchRun(params.runId);
    }
  }, [params.runId, fetchRun]);

  const requestedRunId = params.runId;
  const isLoadingRequestedRun = isFetchingRun && selectedRun?.id !== requestedRunId;

  if (isLoadingRequestedRun) {
    return <main className="min-h-screen bg-[#fbfaf6]"><div className="mx-auto max-w-6xl px-5 py-12 text-sm text-[#667571]">Loading claim workspace…</div></main>;
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#fbfaf6]"><div className="mx-auto max-w-6xl px-5 py-12"><div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">{error}</div></div></main>
    );
  }

  if (!selectedRun || selectedRun.id !== requestedRunId) {
    return <main className="min-h-screen bg-[#fbfaf6]"><div className="mx-auto max-w-6xl px-5 py-12 text-sm text-[#667571]">Claim workspace not found.</div></main>;
  }

  return <NeedsAttentionWorkspace run={selectedRun} />;
}

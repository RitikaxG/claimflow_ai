"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useDashboardStore } from "../../store/use-dashboard-store";
import { DocumentMetadataCard } from "./document-metadata-card";
import { RunHeader } from "./run-header";
import { RunStatusCard } from "./run-status-card";
import { RunTimeline } from "./run-timeline";
import { ExtractedJsonCard } from "./extracted-json-card";
import { ValidationSummaryCard } from "./validation-summary-card";
import { MissingFieldsCard } from "./missing-fields-card";
import { ConflictsCard } from "./conflicts-card";

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

  if (isFetchingRun) {
    return <p className="text-sm text-gray-500">Loading run...</p>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!selectedRun) {
    return <p className="text-sm text-gray-500">Run not found.</p>;
  }

  return (
    <div className="space-y-6">
      <RunHeader runId={selectedRun.id} status={selectedRun.status} />

      <div className="grid gap-6 lg:grid-cols-2">
        <DocumentMetadataCard document={selectedRun.document} />
        <RunStatusCard run={selectedRun} />
      </div>

      <ExtractedJsonCard extractedJson={selectedRun.extractedJson} />

      <ValidationSummaryCard validationJson={selectedRun.validationJson} />

      <div className="grid gap-6 lg:grid-cols-2">
        <MissingFieldsCard missingFieldsJson={selectedRun.missingFieldsJson} />
        <ConflictsCard validationJson={selectedRun.validationJson} />
      </div>

      <RunTimeline events={selectedRun.events} />
    </div>
  );
}
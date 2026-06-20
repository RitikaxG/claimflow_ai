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
import { NeedsReviewCallout } from "./needs-review-callout";
import { SourceDocumentCard } from "./source-document-card";
import { NextRecommendedActionCard } from "./next-recommended-action-card";
import { RunMemoryPanel } from "./run-memory-panel";
import { RunTraceCtaCard } from "./run-trace-cta-card";
import { RunNavigationCard } from "./run-navigation-card";

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
      <RunHeader
        runId={selectedRun.id}
        status={selectedRun.status}
        title={selectedRun.document.filename}
        sourceType={selectedRun.document.sourceType}
      />

      <section className="rounded-2xl border border-blue-100 bg-[var(--cf-blue-soft)] p-4 text-sm leading-6 text-[var(--cf-slate)]">
        This is the control center for one claim. Use the navigation below to open review, coverage, memory, agent, and trace views for the same run.
      </section>

      <RunNavigationCard
        runId={selectedRun.id}
        reviewTaskId={selectedRun.reviewTask?.id ?? null}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <DocumentMetadataCard document={selectedRun.document} />
        <RunStatusCard run={selectedRun} />
      </div>

      <RunTraceCtaCard
        runId={selectedRun.id}
        status={selectedRun.status}
        reviewTaskStatus={selectedRun.reviewTask?.status ?? null}
      />

      <NextRecommendedActionCard run={selectedRun} />

      <RunMemoryPanel runId={selectedRun.id} status={selectedRun.status} />

      <SourceDocumentCard document={selectedRun.document} />

      <ExtractedJsonCard extractedJson={selectedRun.extractedJson} />

      <ValidationSummaryCard validationJson={selectedRun.validationJson} />

      <NeedsReviewCallout validationJson={selectedRun.validationJson} />

      <MissingFieldsCard missingFieldsJson={selectedRun.missingFieldsJson} />

      <ConflictsCard validationJson={selectedRun.validationJson} />

      <RunTimeline
        events={selectedRun.events}
        title="Run Timeline"
        maxItems={8}
        excludeTypes={[
          "AGENT_STEP_STARTED",
          "AGENT_ACTION_PROPOSED",
          "AGENT_ACTION_BLOCKED",
          "AGENT_TOOL_EXECUTED",
          "FOLLOWUP_DRAFT_CREATED",
        ]}
      />
    </div>
  );
}

import { prisma } from "@repo/db";
import type {
  AgentActionTraceRecord,
  GatewayCallTraceRecord,
  MemoryHitTraceRecord,
  RunTraceResponse,
  RunTraceSource,
  RunTraceTimelineItem,
} from "./run-trace-types";

function toIso(value: Date) {
  return value.toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getMetadataTraceId(value: unknown) {
  if (!isRecord(value)) return null;

  const traceId = value.traceId;
  return typeof traceId === "string" && traceId.trim().length > 0
    ? traceId
    : null;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

function humanizeEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getEventSource(type: string): RunTraceSource {
  if (type.startsWith("AGENT_")) return "agent";
  if (type.startsWith("MEMORY_")) return "memory";
  if (type.startsWith("FOLLOWUP_")) return "followup";

  if (
    type === "ADDITIONAL_EVIDENCE_RECEIVED" ||
    type === "ADDITIONAL_INFORMATION_RECEIVED"
  ) {
    return "followup";
  }

  if (type.includes("REVIEW")) return "review";

  return "extraction";
}

function timelineItem(input: RunTraceTimelineItem): RunTraceTimelineItem {
  return input;
}

function sumNumbers(values: Array<number | null | undefined>): number {
  return values.reduce<number>((total, value) => {
    return total + (value ?? 0);
  }, 0);
}

export async function buildRunTrace(
  runId: string,
): Promise<RunTraceResponse | null> {
  const run = await prisma.extractionRun.findUnique({
    where: { id: runId },
    include: {
      document: true,
      events: {
        orderBy: { createdAt: "asc" },
      },
      aiCallLogs: {
        orderBy: { createdAt: "asc" },
      },
      coverageQuestions: {
        orderBy: { createdAt: "asc" },
      },
      agentActionLogs: {
        orderBy: { createdAt: "asc" },
        include: {
          memoryHits: true,
        },
      },
      memoryHits: {
        orderBy: { createdAt: "asc" },
        include: {
          memory: true,
          agentActionLog: true,
        },
      },
      memoryUpdates: {
        orderBy: { createdAt: "asc" },
        include: {
          memory: true,
        },
      },
      followupDrafts: {
        orderBy: { createdAt: "asc" },
      },
      reviewTask: {
        include: {
          decisions: {
            orderBy: { createdAt: "asc" },
          },
          events: {
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!run) return null;

  const gatewayCalls: GatewayCallTraceRecord[] = run.aiCallLogs.map((call) => ({
    id: call.id,
    traceId: call.traceId,
    kind: call.kind,
    status: call.status,
    provider: call.provider,
    model: call.model,
    modelVersion: call.modelVersion,
    promptVersion: call.promptVersion,
    schemaVersion: call.schemaVersion,
    errorType: call.errorType,
    errorMessage: call.errorMessage,
    retryable: call.retryable,
    latencyMs: call.latencyMs,
    inputTokens: call.inputTokens,
    outputTokens: call.outputTokens,
    totalTokens: call.totalTokens,
    estimatedCostUsd: call.estimatedCostUsd,
    createdAt: toIso(call.createdAt),
  }));

  const agentActions: AgentActionTraceRecord[] = run.agentActionLogs.map(
    (action) => ({
      id: action.id,
      action: action.action,
      status: action.status,
      rationale: action.rationale,
      guardrailDecision: action.guardrailDecision,
      blockedReason: action.blockedReason,
      toolName: action.toolName,
      toolInputJson: action.toolInputJson,
      toolOutputJson: action.toolOutputJson,
      memoryHitCount: action.memoryHits.length,
      createdAt: toIso(action.createdAt),
    }),
  );

  const memoryHits: MemoryHitTraceRecord[] = run.memoryHits.map((hit) => ({
    id: hit.id,
    memoryId: hit.memoryId,
    kind: hit.memory.kind,
    riskLevel: hit.memory.riskLevel,
    status: hit.memory.status,
    confidence: hit.memory.confidence,
    summary: hit.memory.summary,
    safeUse: hit.memory.safeUse,
    mustNotDo: toStringArray(hit.memory.mustNotDo),
    score: hit.score,
    matchedOn: hit.matchedOn,
    retrievalReason: hit.retrievalReason,
    usedByAgent: hit.usedByAgent,
    agentActionLogId: hit.agentActionLogId,
    agentAction: hit.agentActionLog?.action ?? null,
    createdAt: toIso(hit.createdAt),
  }));

  const traceId =
    gatewayCalls[0]?.traceId ??
    run.events.map((event) => getMetadataTraceId(event.metadata)).find(Boolean) ??
    null;

  const timeline: RunTraceTimelineItem[] = [
    timelineItem({
      id: `document:${run.document.id}`,
      timestamp: toIso(run.document.createdAt),
      source: "document",
      title: "Document uploaded",
      description: `${run.document.filename} entered the ClaimFlow workflow.`,
      status: run.document.sourceType,
      metadata: {
        documentId: run.document.id,
        sourceType: run.document.sourceType,
        contentHash: run.document.contentHash,
      },
    }),

    ...run.events.map((event) =>
      timelineItem({
        id: `event:${event.id}`,
        timestamp: toIso(event.createdAt),
        source: getEventSource(event.type),
        title: humanizeEnum(event.type),
        description: event.message,
        status: event.type,
        metadata: event.metadata,
      }),
    ),

    ...run.aiCallLogs.map((call) =>
      timelineItem({
        id: `gateway:${call.id}`,
        timestamp: toIso(call.createdAt),
        source: "gateway",
        title: `AI Call: ${humanizeEnum(call.kind)}`,
        description: `${call.provider} / ${call.model} returned ${call.status}.`,
        status: call.status,
        metadata: {
          traceId: call.traceId,
          modelVersion: call.modelVersion,
          promptVersion: call.promptVersion,
          schemaVersion: call.schemaVersion,
          latencyMs: call.latencyMs,
          estimatedCostUsd: call.estimatedCostUsd,
          errorType: call.errorType,
          retryable: call.retryable,
        },
      }),
    ),

    ...run.coverageQuestions.map((question) =>
      timelineItem({
        id: `rag:${question.id}`,
        timestamp: toIso(question.createdAt),
        source: "rag",
        title: "Policy evidence retrieved",
        description: question.question,
        status: question.finalDecision,
        metadata: {
          normalizedQuery: question.normalizedQuery,
          retrievalStatus: question.retrievalStatus,
          retrievalJson: question.retrievalJson,
          answerJson: question.answerJson,
        },
      }),
    ),

    ...run.agentActionLogs.map((action) =>
      timelineItem({
        id: `agent:${action.id}`,
        timestamp: toIso(action.createdAt),
        source: "agent",
        title: `Agent action: ${humanizeEnum(action.action)}`,
        description:
          action.rationale ?? `Agent action logged with status ${action.status}.`,
        status: action.guardrailDecision ?? action.status,
        metadata: {
          action: action.action,
          status: action.status,
          guardrailDecision: action.guardrailDecision,
          blockedReason: action.blockedReason,
          toolName: action.toolName,
          memoryHitCount: action.memoryHits.length,
        },
      }),
    ),

    ...run.memoryHits.map((hit) =>
      timelineItem({
        id: `memory-hit:${hit.id}`,
        timestamp: toIso(hit.createdAt),
        source: "memory",
        title: hit.usedByAgent ? "Memory used by agent" : "Memory retrieved",
        description: hit.memory.summary,
        status: hit.memory.riskLevel,
        metadata: {
          memoryId: hit.memoryId,
          memoryHitId: hit.id,
          kind: hit.memory.kind,
          score: hit.score,
          usedByAgent: hit.usedByAgent,
          retrievalReason: hit.retrievalReason,
        },
      }),
    ),

    ...run.memoryUpdates.map((update) =>
      timelineItem({
        id: `memory-update:${update.id}`,
        timestamp: toIso(update.createdAt),
        source: "memory",
        title: `Memory update: ${humanizeEnum(update.updateType)}`,
        description: update.note ?? update.memory.summary,
        status: update.afterStatus ?? update.beforeStatus,
        metadata: {
          memoryId: update.memoryId,
          updateType: update.updateType,
          beforeStatus: update.beforeStatus,
          afterStatus: update.afterStatus,
          confidenceDelta: update.confidenceDelta,
        },
      }),
    ),

    ...run.followupDrafts.map((draft) =>
      timelineItem({
        id: `followup:${draft.id}`,
        timestamp: toIso(draft.createdAt),
        source: "followup",
        title: "Follow-up draft created",
        description: draft.subject,
        status: draft.status,
        metadata: {
          requestType: draft.requestType,
          requestedEvidence: draft.requestedEvidence,
          requestedFields: draft.requestedFields,
          fieldRequests: draft.fieldRequests,
        },
      }),
    ),

    ...(run.reviewTask?.events ?? []).map((event) =>
      timelineItem({
        id: `review-event:${event.id}`,
        timestamp: toIso(event.createdAt),
        source: "review",
        title: humanizeEnum(event.type),
        description: event.message,
        status: event.type,
        metadata: event.metadata,
      }),
    ),

    ...(run.reviewTask?.decisions ?? []).map((decision) =>
      timelineItem({
        id: `review-decision:${decision.id}`,
        timestamp: toIso(decision.createdAt),
        source: "review",
        title: "Human decision submitted",
        description:
          decision.notes ?? `Reviewer submitted ${humanizeEnum(decision.decision)}.`,
        status: decision.decision,
        metadata: {
          decisionId: decision.id,
          reviewerName: decision.reviewerName,
          hasCorrectedJson: Boolean(decision.correctedJson),
          hasCorrectedValidationJson: Boolean(decision.correctedValidationJson),
        },
      }),
    ),
  ].sort(
    (left, right) =>
      new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
  );

  return {
    run: {
      id: run.id,
      status: run.status,
      model: run.model,
      promptVersion: run.promptVersion,
      schemaVersion: run.schemaVersion,
      errorMessage: run.errorMessage,
      createdAt: toIso(run.createdAt),
      updatedAt: toIso(run.updatedAt),
    },
    document: {
      id: run.document.id,
      filename: run.document.filename,
      mimeType: run.document.mimeType,
      sizeBytes: run.document.sizeBytes,
      sourceType: run.document.sourceType,
      contentHash: run.document.contentHash,
      createdAt: toIso(run.document.createdAt),
    },
    traceId,
    summary: {
      totalAiCalls: run.aiCallLogs.length,
      failedAiCalls: run.aiCallLogs.filter((call) =>
        ["FAILED", "RETRYABLE", "BLOCKED"].includes(call.status),
      ).length,
      retryableFailures: run.aiCallLogs.filter(
        (call) => call.retryable || call.status === "RETRYABLE",
      ).length,
      totalAgentActions: run.agentActionLogs.length,
      blockedAgentActions: run.agentActionLogs.filter(
        (action) =>
          action.status === "BLOCKED" || action.guardrailDecision === "BLOCKED",
      ).length,
      totalMemoryHits: run.memoryHits.length,
      usedMemoryHits: run.memoryHits.filter((hit) => hit.usedByAgent).length,
      totalCostUsd: sumNumbers(
        run.aiCallLogs.map((call) => call.estimatedCostUsd),
      ),
      totalLatencyMs: sumNumbers(run.aiCallLogs.map((call) => call.latencyMs)),
      reviewStatus: run.reviewTask?.status ?? null,
      finalRunStatus: run.status,
    },
    gatewayCalls,
    agentActions,
    memoryHits,
    timeline,
  };
}
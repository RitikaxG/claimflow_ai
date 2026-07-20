import { ExtractionEventType, Prisma, prisma } from "@repo/db";
import { applyMemoryConfidenceUpdate } from "@repo/memory";
import { NextResponse } from "next/server";
import { getRunMemoryAudit } from "../../../../../../../lib/memory/get-run-memory-audit";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    runId: string;
    memoryId: string;
  }>;
};

type MemoryFeedbackRequestBody = {
  memoryHitId?: string;
  reviewDecisionId?: string;
  relevance?: "CONFIRMED_RELEVANT" | "IRRELEVANT";
  note?: string;
};

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request, { params }: Params) {
  const { runId, memoryId } = await params;

  let body: MemoryFeedbackRequestBody = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const relevance = body.relevance;

  if (relevance !== "CONFIRMED_RELEVANT" && relevance !== "IRRELEVANT") {
    return NextResponse.json(
      {
        error: "relevance must be either CONFIRMED_RELEVANT or IRRELEVANT.",
      },
      { status: 400 },
    );
  }

  let memoryHitId = getOptionalString(body.memoryHitId);
  const reviewDecisionId = getOptionalString(body.reviewDecisionId);
  const note = getOptionalString(body.note);

  let resolvedMemoryId = memoryId;
  let memory = await prisma.workflowMemory.findUnique({
    where: {
      id: resolvedMemoryId,
    },
    select: {
      id: true,
      status: true,
      confidence: true,
    },
  });

  // Some retrieved-memory payloads historically used the MemoryHit id in the
  // route. Resolve that scoped hit to its canonical WorkflowMemory id instead
  // of returning a misleading 404.
  if (!memory) {
    const routeMemoryHit = await prisma.memoryHit.findFirst({
      where: {
        id: memoryId,
        runId,
      },
      select: {
        id: true,
        memoryId: true,
      },
    });

    if (routeMemoryHit) {
      resolvedMemoryId = routeMemoryHit.memoryId;
      memoryHitId ??= routeMemoryHit.id;
      memory = await prisma.workflowMemory.findUnique({
        where: {
          id: resolvedMemoryId,
        },
        select: {
          id: true,
          status: true,
          confidence: true,
        },
      });
    }
  }

  if (!memory) {
    return NextResponse.json(
      { error: "Workflow memory not found." },
      { status: 404 },
    );
  }

  if (memoryHitId) {
    const hit = await prisma.memoryHit.findUnique({
      where: {
        id: memoryHitId,
      },
      select: {
        id: true,
        memoryId: true,
        runId: true,
      },
    });

    if (!hit || hit.memoryId !== resolvedMemoryId) {
      return NextResponse.json(
        { error: "Memory hit does not belong to this memory." },
        { status: 400 },
      );
    }

    if (hit.runId !== runId) {
      return NextResponse.json(
        { error: "Memory hit does not belong to this run." },
        { status: 400 },
      );
    }
  }

  if (memoryHitId) {
    const previousUpdates = await prisma.memoryUpdate.findMany({
      where: {
        memoryId: resolvedMemoryId,
        runId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
      select: {
        id: true,
        updateType: true,
        beforeStatus: true,
        afterStatus: true,
        metadata: true,
      },
    });

    const existingFeedback = previousUpdates.find((update) => {
      if (!isRecord(update.metadata)) return false;
      return (
        update.metadata.source === "reviewer_memory_feedback_ui" &&
        update.metadata.memoryHitId === memoryHitId
      );
    });

    if (existingFeedback) {
      const recordedRelevance = isRecord(existingFeedback.metadata)
        ? existingFeedback.metadata.relevance
        : null;

      if (recordedRelevance !== relevance) {
        return NextResponse.json(
          { error: "Feedback has already been recorded for this guidance." },
          { status: 409 },
        );
      }

      return NextResponse.json({
        memoryId: resolvedMemoryId,
        duplicate: true,
        feedback: {
          memoryId: resolvedMemoryId,
          changed: false,
          beforeStatus: existingFeedback.beforeStatus ?? memory.status,
          afterStatus: existingFeedback.afterStatus ?? memory.status,
          beforeConfidence: memory.confidence,
          afterConfidence: memory.confidence,
          updateType: existingFeedback.updateType,
          memoryUpdateId: existingFeedback.id,
        },
        audit: await getRunMemoryAudit(runId),
      });
    }
  }

  const updateType =
    relevance === "CONFIRMED_RELEVANT" ? "STRENGTHENED" : "WEAKENED";

  const feedback = await applyMemoryConfidenceUpdate({
    memoryId: resolvedMemoryId,
    updateType,
    runId: runId ?? null,
    reviewDecisionId: reviewDecisionId ?? null,
    note: note ?? `Reviewer marked memory as ${relevance}.`,
    metadata: {
      source: "reviewer_memory_feedback_ui",
      memoryHitId: memoryHitId ?? null,
      relevance,
    },
  });

  if (runId) {
    await prisma.extractionEvent.create({
      data: {
        runId,
        type: ExtractionEventType.MEMORY_FEEDBACK_RECORDED,
        message: `Reviewer marked workflow memory as ${relevance}.`,
        metadata: toPrismaJson({
          memoryId: resolvedMemoryId,
          memoryHitId: memoryHitId ?? null,
          relevance,
          updateType: feedback.updateType,
          memoryUpdateId: feedback.memoryUpdateId,
          beforeStatus: feedback.beforeStatus,
          afterStatus: feedback.afterStatus,
          beforeConfidence: feedback.beforeConfidence,
          afterConfidence: feedback.afterConfidence,
        }),
      },
    });
  }

  return NextResponse.json({
    memoryId: resolvedMemoryId,
    feedback,
    audit: runId ? await getRunMemoryAudit(runId) : null,
  });
}

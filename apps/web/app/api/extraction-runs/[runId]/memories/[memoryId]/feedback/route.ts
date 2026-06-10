import {
  ExtractionEventType,
  Prisma,
  prisma,
} from "@repo/db";
import { applyMemoryConfidenceUpdate } from "@repo/memory";
import { NextResponse } from "next/server";
import { getRunMemoryAudit } from "../../../../../../../lib/memory/get-run-memory-audit";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    memoryId: string;
  }>;
};

type MemoryFeedbackRequestBody = {
  runId?: string;
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

export async function POST(request: Request, { params }: Params) {
  const { memoryId } = await params;

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
        error:
          "relevance must be either CONFIRMED_RELEVANT or IRRELEVANT.",
      },
      { status: 400 },
    );
  }

  const runId = getOptionalString(body.runId);
  const memoryHitId = getOptionalString(body.memoryHitId);
  const reviewDecisionId = getOptionalString(body.reviewDecisionId);
  const note = getOptionalString(body.note);

  const memory = await prisma.workflowMemory.findUnique({
    where: {
      id: memoryId,
    },
    select: {
      id: true,
      status: true,
    },
  });

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

    if (!hit || hit.memoryId !== memoryId) {
      return NextResponse.json(
        { error: "Memory hit does not belong to this memory." },
        { status: 400 },
      );
    }

    if (runId && hit.runId !== runId) {
      return NextResponse.json(
        { error: "Memory hit does not belong to this run." },
        { status: 400 },
      );
    }
  }

  const updateType =
    relevance === "CONFIRMED_RELEVANT" ? "STRENGTHENED" : "WEAKENED";

  const feedback = await applyMemoryConfidenceUpdate({
    memoryId,
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
          memoryId,
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
    memoryId,
    feedback,
    audit: runId ? await getRunMemoryAudit(runId) : null,
  });
}
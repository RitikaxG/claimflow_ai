import {
  ExtractionEventType,
  Prisma,
  prisma,
} from "@repo/db";
import { retrieveRelevantMemories } from "@repo/memory";
import { NextResponse } from "next/server";
import { getRunMemoryAudit } from "../../../../../../lib/memory/get-run-memory-audit";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    runId: string;
  }>;
};

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function POST(_request: Request, { params }: Params) {
  const { runId } = await params;

  const run = await prisma.extractionRun.findUnique({
    where: {
      id: runId,
    },
    select: {
      id: true,
      status: true,
      extractedJson: true,
      validationJson: true,
      document: {
        select: {
          deletedAt: true,
        },
      },
    },
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  if (run.document.deletedAt) {
    return NextResponse.json(
      { error: "This document has been deleted. Memory retrieval cannot run." },
      { status: 400 },
    );
  }

  if (run.status !== "COMPLETED" && run.status !== "NEEDS_REVIEW") {
    return NextResponse.json(
      {
        error: `Memory retrieval can only run after validation. Current run status: ${run.status}`,
      },
      { status: 409 },
    );
  }

  if (!run.extractedJson || !run.validationJson) {
    return NextResponse.json(
      {
        error:
          "Run must have extractedJson and validationJson before memory retrieval.",
      },
      { status: 400 },
    );
  }

  const retrieval = await retrieveRelevantMemories({
    runId,
    writeHits: true,
    limit: 5,
  });

  await prisma.extractionEvent.create({
    data: {
      runId,
      type: ExtractionEventType.MEMORY_RETRIEVED,
      message: `Retrieved ${retrieval.memories.length} relevant workflow memories.`,
      metadata: toPrismaJson({
        totalCandidates: retrieval.totalCandidates,
        writtenHitCount: retrieval.writtenHitCount,
        memoryIds: retrieval.memories.map((memory) => memory.memoryId),
      }),
    },
  });

  const audit = await getRunMemoryAudit(runId);

  return NextResponse.json({
    runId,
    retrieval,
    audit,
  });
}
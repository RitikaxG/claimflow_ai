import { prisma } from "@repo/db";
import { NextResponse } from "next/server";
import { getRunMemoryAudit } from "../../../../../lib/memory/get-run-memory-audit";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    runId: string;
  }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { runId } = await params;

  const run = await prisma.extractionRun.findUnique({
    where: {
      id: runId,
    },
    select: {
      id: true,
    },
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  const audit = await getRunMemoryAudit(runId);

  return NextResponse.json(audit);
}
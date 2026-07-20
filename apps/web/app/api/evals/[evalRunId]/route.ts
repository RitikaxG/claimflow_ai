import { prisma } from "@repo/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    evalRunId: string;
  }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { evalRunId } = await params;

  const evalRun = await prisma.evalRun.findUnique({
    where: { id: evalRunId },
    include: {
      cases: {
        orderBy: { caseId: "asc" },
      },
    },
  });

  if (!evalRun) {
    return NextResponse.json({ error: "Quality report not found." }, { status: 404 });
  }

  return NextResponse.json({ evalRun });
}

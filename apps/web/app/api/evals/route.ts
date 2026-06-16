import { prisma } from "@repo/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const evalRuns = await prisma.evalRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json({ evalRuns });
}
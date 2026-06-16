import { prisma } from "@repo/db";
import { NextResponse } from "next/server";
import { EVAL_SUITES } from "../../../../lib/evals/eval-suite-metadata";

export const runtime = "nodejs";

export async function GET() {
  const suites = await Promise.all(
    EVAL_SUITES.map(async (suite) => {
      const latestRun = await prisma.evalRun.findFirst({
        where: { suite: suite.suite },
        orderBy: { createdAt: "desc" },
      });

      return {
        ...suite,
        latestRun,
      };
    }),
  );

  return NextResponse.json({ suites });
}
import { NextResponse } from "next/server";
import { buildRunTrace } from "../../../../../lib/runs/build-run-trace";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    runId: string;
  }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { runId } = await params;

  const trace = await buildRunTrace(runId);

  if (!trace) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  return NextResponse.json(trace);
}
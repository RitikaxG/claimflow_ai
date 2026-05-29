import { prisma } from "@repo/db";
import { runAgentStep } from "@repo/agent";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
    params : Promise<{
        runId : string;
    }>;
};

export async function POST(_request : Request, { params } : Params ){
    const { runId } = await params;

    const existingRun = await prisma.extractionRun.findUnique({
        where : { id : runId },
        select : { id : true },
    });

    if(!existingRun){
        return NextResponse.json(
            { error : "Run not found." },
            { status : 404 },
        )
    }

    try{
        const result = await runAgentStep(runId);

        const latestRunState = await prisma.extractionRun.findUnique({
            where : {
                id : runId
            },
            include : {
                reviewTask : true,
                followupDrafts : {
                    orderBy : {
                        createdAt : "desc",
                    },
                    take : 1,
                },
                agentActionLogs : {
                    orderBy : {
                        createdAt : "desc",
                    },
                    take : 10,
                },
                events : {
                    orderBy : {
                        createdAt : "asc",
                    },
                }
            }
        });

        return NextResponse.json({
            proposedAction : result.proposedAction,
            GuardrailDecision : result.guardrail.decision,
            blockedReason : result.guardrail.decision === "BLOCKED"
                ? result.guardrail.reason 
                : null,
            toolOutput : result.toolOutput,
            deterministicPostActionOutput : result.deterministicPostActionOutput,
            latestReviewTask : latestRunState?.reviewTask ?? null,
            latestFollowupDraft : latestRunState?.followupDrafts[0] ?? null,
            agentActionLogs : latestRunState?.agentActionLogs ?? [],
            timelineEvents : latestRunState?.events ?? [],

        });
    }catch(error){
        const message = 
            error instanceof Error 
            ? error.message 
            : "Failed to run agent step.";

        return NextResponse.json(
            { error : message },
            { status : 500 },
        )
    }
}
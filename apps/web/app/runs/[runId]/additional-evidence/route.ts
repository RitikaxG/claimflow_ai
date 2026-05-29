import { prisma } from "@repo/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
    params : Promise<{
        runId : string;
    }>;
};

function isRecord(value : unknown): value is Record<string,unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request : Request, { params } : Params) {
    const { runId } = await params;
    const body = await request.json().catch(() => null);

    if(!isRecord(body)){
        return NextResponse.json(
            { error : "Invalid request body." },
            { status : 400 },
        );
    }

    const evidenceType =
        typeof body.evidenceType === "string"
            ? body.evidenceType.trim()
            : "";

    const note =
        typeof body.note === "string"
            ? body.note.trim()
            : "";

    if(!evidenceType){
        return NextResponse.json(
            { error : "evidenceType is required." },
            { status : 400 },
        );
    }

    const run = await prisma.extractionRun.findUnique({
        where : {
            id : runId,
        },
        select : {
            id : true,
        },
    });

    if(!run){
        return NextResponse.json(
            { error : "Run not found." },
            { status : 404 },
        );
    }

    const event = await prisma.extractionEvent.create({
        data : {
            runId,
            type : "ADDITIONAL_EVIDENCE_RECEIVED",
            message : `Additional evidence received: ${evidenceType}`,
            metadata : {
                evidenceType,
                note : note || null,
            },
        },
    });

    return NextResponse.json({
        event,
    });
}
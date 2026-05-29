import { prisma } from "@repo/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
    params : Promise<{
        runId : string;
    }>;
};

type EvidenceItemInput = {
    label : string,
    note? : string,
};

function isRecord(value : unknown): value is Record<string,unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseEvidenceItems(value : unknown): EvidenceItemInput[] {
    if(!Array.isArray(value)){
        return [];
    }

    return value
        .map((item) : EvidenceItemInput | null => {
            if(!isRecord(item)){
                return null;
            }

            const label =
                typeof item.label === "string"
                    ? item.label.trim()
                    : "";

            const note =
                typeof item.note === "string"
                    ? item.note.trim()
                    : "";

            if(!label){
                return null;
            }

            if(note){
                return {
                    label,
                    note,
                };
            }

            return {
                label,
            };
        })
        .filter((item) : item is EvidenceItemInput => item !== null);
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

    const evidenceItems = parseEvidenceItems(body.evidenceItems);

    if(evidenceItems.length === 0){
        return NextResponse.json(
            { error : "At least one evidence item is required." },
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
            message : `Additional evidence received: ${evidenceItems
                .map((item) => item.label)
                .join(", ")}`,
            metadata : {
                evidenceItems,
            },
        },
    });

    return NextResponse.json({
        event,
    });
}
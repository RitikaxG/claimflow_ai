import { prisma } from "@repo/db";
import { NextResponse } from "next/server";

/*
Route Handler/server code → use { params }
Client component/page UI → useParams()
*/

type Params = {
    params : Promise<{
        runId : string;
    }>;
};

export async function GET(_request : Request, { params } : Params ) {
    const { runId } = await params;

    const run = await prisma.extractionRun.findUnique({
        where : { id : runId },
        include : {
            document : true,
            events : {
                orderBy : { createdAt : "asc" },
            },
        },
    });

    if(!run){
        return NextResponse.json({ error : "Run not found", status : 404 });
    }

    return NextResponse.json({ run });
}
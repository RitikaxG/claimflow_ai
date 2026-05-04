// Gives the dashboard data
import { prisma } from "@repo/db";
import { NextResponse } from "next/server";

export async function GET(){
    const runs = await prisma.extractionRun.findMany({
        orderBy : {
            createdAt : "asc",
        },
        take : 20,
        include : {
            document : true,
            events : {
                orderBy : {
                    createdAt : "asc",
                },
            },
        },
    });

    return NextResponse.json({ runs })
}
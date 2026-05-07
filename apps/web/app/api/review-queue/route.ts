import { prisma } from "@repo/db";
import { NextResponse } from "next/server";

export async function GET(){
    const runs = await prisma.extractionRun.findMany({
        where : {
            status : "NEEDS_REVIEW"
        },
        orderBy : {
            createdAt : "desc",
        },
        include : {
            document : true,
            events : {
                orderBy : {
                    createdAt : "asc"
                }
            }
        }
    });

    return NextResponse.json({ runs });
}
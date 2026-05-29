import { prisma } from "@repo/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
    params : Promise<{
        taskId : string;
    }>;
};

export async function POST(_request : Request, { params } : Params) {
    const { taskId } = await params;

    const existingTask = await prisma.reviewTask.findUnique({
        where : {
            id : taskId,
        },
        select : {
            id : true,
            runId : true,
            status : true,
        },
    });

    if(!existingTask){
        return NextResponse.json(
            { error : "Review task not found." },
            { status : 404 },
        );
    }

    if(existingTask.status !== "NEEDS_MORE_INFO"){
        return NextResponse.json(
            {
                error : `Only NEEDS_MORE_INFO review tasks can be reopened. Current status: ${existingTask.status}`,
            },
            { status : 400 },
        );
    }

    const reviewTask = await prisma.$transaction(async(tx) => {
        await tx.reviewTask.update({
            where : {
                id : taskId,
            },
            data : {
                status : "PENDING",
                startedAt : null,
                completedAt : null,
            },
        });

        await tx.extractionEvent.create({
            data : {
                runId : existingTask.runId,
                type : "REVIEW_REOPENED",
                message : "Review reopened after additional evidence was received.",
                metadata : {
                    reviewTaskId : taskId,
                },
            },
        });

        return tx.reviewTask.findUnique({
            where : {
                id : taskId,
            },
            include : {
                run : {
                    include : {
                        document : true,
                        events : {
                            orderBy : {
                                createdAt : "asc",
                            },
                        },
                        followupDrafts : {
                            orderBy : {
                                createdAt : "desc",
                            },
                        },
                    },
                },
                decisions : {
                    orderBy : {
                        createdAt : "desc",
                    },
                },
                events : {
                    orderBy : {
                        createdAt : "asc",
                    },
                },
            },
        });
    });

    return NextResponse.json({
        reviewTask,
    });
}
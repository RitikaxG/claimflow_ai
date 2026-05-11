import { prisma, ReviewEventType } from "@repo/db";
import { NextResponse } from "next/server";

type Params = {
    params : Promise<{
        taskId : string;
    }>;
}

export async function POST(_request : Request, { params } : Params){
    const { taskId } = await params;

    const task = await prisma.reviewTask.findUnique({
        where : {
            id : taskId,
        }
    });

    if(!task){
        return NextResponse.json(
            { error : "Review task not found."},
            { status : 404 },
        )
    }

    if(task.status !== "PENDING"){
        return NextResponse.json(
            { error : `Review can only start from PENDING status. Current status : ${task.status}`},
            { status : 409 },
        )
    }

    const updatedTask = await prisma.$transaction(async (tx) => {
        await tx.reviewEvent.create({
            data : {
                taskId,
                type : ReviewEventType.REVIEW_STARTED,
                message : "Human review started.",
            }
        });

        await tx.reviewTask.update({
            where : {
                id : taskId,
            },
            data : {
                status : "IN_REVIEW",
                startedAt : new Date(),
            },
            include : {
                run : {
                    include : {
                        document : true,
                        events : {
                            orderBy : {
                                createdAt : "asc",
                            }
                        }
                    }
                },
                decisions : {
                    orderBy : {
                        createdAt : "desc",
                    }
                },
                events : {
                    orderBy : {
                        createdAt : "asc",
                    }
                }
            }
        })
    });

    return NextResponse.json({ reviewTask : updatedTask });
}
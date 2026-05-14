import { prisma, ReviewDecisionType, ReviewEventType, ReviewTaskStatus, Prisma } from "@repo/db";
import { NextResponse } from "next/server";

type RejectRequestBody = {
    reviewerName? : string,
    notes? : string,
}

type Params = {
    params : Promise<{
        taskId : string;
    }>;
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getOptionalString(value : unknown) : string | undefined {
    if(typeof value !== "string"){
        return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

export async function POST(request : Request, { params } : Params){
    const { taskId } = await params;

    let body : RejectRequestBody = {};
    try{
        body = await request.json();
    }catch{
        body = {};
    }

    const reviewerName = getOptionalString(body.reviewerName);
    const notes = getOptionalString(body.notes);

    if(!notes){
        return NextResponse.json({
            error : "Rejecting a review task requires notes."
        },{ status : 400 });
    }
    
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

    if(task.status !== ReviewTaskStatus.IN_REVIEW){
        return NextResponse.json(
            { error : `Rejection can only be done when status is IN_REVIEW. Current status : ${task.status}`},
            { status : 409 },
        )
    }

    const updatedTask = await prisma.$transaction(async (tx) => {
        const decision = await tx.reviewDecision.create({
            data : {
                taskId,
                decision : ReviewDecisionType.REJECT,
                reviewerName,
                notes
            }
        });

        await tx.reviewEvent.create({
            data : {
                taskId,
                type : ReviewEventType.REVIEW_REJECTED,
                message : "Human reviewer rejected the extraction result.",
                metadata : toPrismaJson({
                    runId : task.runId,
                    previousStatus : task.status,
                    newStatus : ReviewTaskStatus.REJECTED,
                    decision : ReviewDecisionType.REJECT,
                    decisionId : decision.id,
                    reviewerName,
                    notes,
                }),
            }
        });

        return tx.reviewTask.update({
            where : {
                id : taskId,
            },
            data : {
                status : ReviewTaskStatus.REJECTED,
                completedAt : new Date(),
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
    })
    return NextResponse.json({ reviewTask : updatedTask });
}
import { prisma, Prisma, ReviewDecisionType, ReviewEventType, ReviewTaskStatus } from "@repo/db";
import { ClaimExtractionSchema } from "@repo/shared/schemas";
import { NextResponse } from "next/server";

type EditAndApproveRequestBody = {
    correctedJson? : unknown,
    reviewerName? : string,
    notes? : string,
}

type Params = {
    params : Promise<{
        taskId : string,
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

export async function POST(request : Request, { params } : Params ){
    const { taskId } = await params;
    let body : EditAndApproveRequestBody;
    try{
        body = await request.json();
    }
    catch{
        body = {};
    }

    const task = await prisma.reviewTask.findUnique({
        where : {
            id : taskId,
        }
    });

    if(!task){
        return NextResponse.json(
            { error : "Review task not found" },
            { status : 404 },
        )
    }

    if(task.status !== "IN_REVIEW"){
        return NextResponse.json(
            { error : "Only tasks that are in review can be edited and approved."},
            { status : 409 },
        )
    }

    const reviewerName = getOptionalString(body.reviewerName);
    const notes = getOptionalString(body.notes);

    const parsed = ClaimExtractionSchema.safeParse(body.correctedJson);
    if(!parsed.success){
        return NextResponse.json(
            { error : "Corrected JSON does not match ClaimExtractionSchema" },
            { status : 400 },
        )
    }
    
    const correctedJson = toPrismaJson(parsed.data);

    const updatedTask = await prisma.$transaction(async (tx) => {
        const decision = await tx.reviewDecision.create({
            data : {
                taskId,
                decision : ReviewDecisionType.EDIT_AND_APPROVE,
                reviewerName,
                notes,
                correctedJson,
            }
        });

        await tx.reviewEvent.create({
            data : {
                taskId,
                type : ReviewEventType.REVIEW_EDITED_AND_APPROVED,
                message : "Review task approved with edits.",
                metadata : {
                    runId : task.runId,
                    previousStatus : task.status,
                    newStatus : ReviewTaskStatus.EDITED_AND_APPROVED,
                    decision : ReviewDecisionType.EDIT_AND_APPROVE,
                    decisionId : decision.id,
                    reviewerName,
                    notes,
                }
            }
        })

        return tx.reviewTask.update({
            where : {
                id : taskId,
            },
            data : {
                status : ReviewTaskStatus.EDITED_AND_APPROVED,
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
                        createdAt : "asc"
                    }
                }
            }
        });
    });
    return NextResponse.json({ reviewTask : updatedTask });
}
import { prisma, ReviewDecisionType, ReviewEventType, ReviewTaskStatus, Prisma } from "@repo/db";
import { NextResponse } from "next/server";

type RequestMoreInfoRequestBody = {
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

const reviewTaskInclude = {
  run: {
    include: {
      document: true,
      events: {
        orderBy: {
          createdAt: "asc" as const,
        },
      },
    },
  },
  decisions: {
    orderBy: {
      createdAt: "desc" as const,
    },
  },
  events: {
    orderBy: {
      createdAt: "asc" as const,
    },
  },
};


export async function POST(request : Request, { params } : Params){
    const { taskId } = await params;

    let body : RequestMoreInfoRequestBody = {};
    try{
        body = await request.json();
    }catch{
        body = {};
    }

    const reviewerName = getOptionalString(body.reviewerName);
    const notes = getOptionalString(body.notes);

    if(!notes){
        return NextResponse.json({
            error : "Requesting more information for a review task requires notes."
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
            { error : `More info can only be requested when status is IN_REVIEW. Current status : ${task.status}`},
            { status : 409 },
        )
    }

    const updatedTask = await prisma.$transaction(async (tx) => {
        const claimed = await tx.reviewTask.updateMany({
            where : {
                id : taskId,
                status: ReviewTaskStatus.IN_REVIEW,
            },
            data : {
                status : ReviewTaskStatus.NEEDS_MORE_INFO,
                completedAt : new Date(),
            }
        });

        if(claimed.count !== 1){
            return null;
        }

        const decision = await tx.reviewDecision.create({
            data : {
                taskId,
                decision : ReviewDecisionType.REQUEST_MORE_INFO,
                reviewerName,
                notes
            }
        });

        await tx.reviewEvent.create({
            data : {
                taskId,
                type : ReviewEventType.REVIEW_MORE_INFO_REQUESTED,
                message : "Human reviewer requested more information.",
                metadata : toPrismaJson({
                    runId : task.runId,
                    previousStatus : task.status,
                    newStatus : ReviewTaskStatus.NEEDS_MORE_INFO,
                    decision : ReviewDecisionType.REQUEST_MORE_INFO,
                    decisionId : decision.id,
                    reviewerName,
                    notes,
                }),
            }
        });

        return tx.reviewTask.findUniqueOrThrow({
            where : {
                id : taskId,
            },
            include : reviewTaskInclude,
        });
    });

    if(!updatedTask){
        return NextResponse.json(
            { error : "Review task was already completed by another action."},
            { status : 409 },
        )
    }
    return NextResponse.json({ reviewTask : updatedTask });
}
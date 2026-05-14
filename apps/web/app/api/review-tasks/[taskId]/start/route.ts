import { prisma, ReviewEventType, ReviewTaskStatus, Prisma } from "@repo/db";
import { NextResponse } from "next/server";

type Params = {
    params : Promise<{
        taskId : string;
    }>;
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
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

    if (task.status === ReviewTaskStatus.IN_REVIEW) {
        const existingTask = await prisma.reviewTask.findUnique({
            where: {
                id: taskId,
            },
            include: reviewTaskInclude,
        });

        return NextResponse.json({
            reviewTask: existingTask,
            alreadyStarted: true,
        });
    }

    if(task.status !== ReviewTaskStatus.PENDING){
        return NextResponse.json(
            { error : `Review can only start from PENDING status. Current status : ${task.status}`},
            { status : 409 },
        )
    }

    const updatedTask = await prisma.$transaction(async (tx) => {
        const claimed = await tx.reviewTask.updateMany({
            where : {
                id : taskId,
                status : ReviewTaskStatus.PENDING,
            },
            data : {
                status : ReviewTaskStatus.IN_REVIEW,
                startedAt : new Date(),
            }
        });

        if(claimed.count !== 1){
            return null;
        }

        await tx.reviewEvent.create({
            data : {
                taskId,
                type : ReviewEventType.REVIEW_STARTED,
                message : "Human review started.",
                metadata : toPrismaJson({
                    runId : task.runId,
                    previousStatus : task.status,
                    newStatus : ReviewTaskStatus.IN_REVIEW,
                })
            }
        });

        return tx.reviewTask.findUniqueOrThrow({
            where : {
                id : taskId,
            },
            include : reviewTaskInclude,
        })
    });

    if(!updatedTask){
        return NextResponse.json(
            { error: "Review task was already started or completed." },
            { status: 409 },
        );
    }

    return NextResponse.json({ reviewTask : updatedTask });
}
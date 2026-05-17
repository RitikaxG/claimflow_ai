import { prisma } from "@repo/db";
import { NextResponse } from "next/server";
import { getWorkflowDisplayStatus } from "../../../../lib/workflow/get-workflow-display-status";

type Params = {
    params : Promise<{
        taskId : string;
    }>;
}

export async function GET(_request : Request, { params } : Params){
    const { taskId } = await params;

    const reviewTask = await prisma.reviewTask.findUnique({
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
                        }
                    }
                }
            },
            decisions : {
                orderBy : {
                    createdAt : "desc",
                }
            },
            events : { // review task events
                orderBy : {
                    createdAt : "asc",
                }
            }
        }
    });

    if(!reviewTask){
        return NextResponse.json(
            { error : "Review task not found."},
            { status : 404 },
        )
    }

    return NextResponse.json({
        reviewTask: {
            ...reviewTask,
            workflowDisplayStatus: getWorkflowDisplayStatus({
            status: reviewTask.run.status,
            reviewTask: {
                status: reviewTask.status,
            },
            }),
        },
    });
}
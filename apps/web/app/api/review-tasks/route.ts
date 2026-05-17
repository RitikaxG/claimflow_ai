// Return all review tasks with run, document, decisions, and events.

import { prisma } from "@repo/db";
import { NextResponse } from "next/server";
import { getWorkflowDisplayStatus } from "../../../lib/workflow/get-workflow-display-status";

export async function GET(){
    const reviewTasks = await prisma.reviewTask.findMany({
        where : {
            run : {
                document : {
                    deletedAt : null,
                }
            }
        },
        orderBy : {
            createdAt : "desc",
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
                }
            }
        }
    });

    const reviewTasksWithWorkflowStatus = reviewTasks.map((reviewTask) => ({
    ...reviewTask,
    workflowDisplayStatus: getWorkflowDisplayStatus({
        status: reviewTask.run.status,
        reviewTask: {
        status: reviewTask.status,
        },
    }),
    }));

    return NextResponse.json({ reviewTasks: reviewTasksWithWorkflowStatus });
}
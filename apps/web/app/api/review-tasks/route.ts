// Return all review tasks with run, document, decisions, and events.

import { prisma } from "@repo/db";
import { NextResponse } from "next/server";

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

    return NextResponse.json({ reviewTasks });
}
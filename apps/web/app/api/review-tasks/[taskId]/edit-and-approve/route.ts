import { prisma, Prisma, ReviewDecisionType, ReviewEventType, ReviewTaskStatus } from "@repo/db";
import { ClaimExtractionSchema } from "@repo/shared/schemas";
import { NextResponse } from "next/server";
import { buildHumanReviewedClaim } from "../../../../../lib/review/build-human-reviewed-claim";
import { learnFromReviewDecision } from "../../../../../lib/memory/learn-from-review-decision";

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


export async function POST(request : Request, { params } : Params ){
    const { taskId } = await params;
    let body : EditAndApproveRequestBody = {};
    try{
        body = await request.json();
    }
    catch{
        body = {};
    }

    const reviewerName = getOptionalString(body.reviewerName);
    const notes = getOptionalString(body.notes);

    if(body.correctedJson === undefined || body.correctedJson === null){
        return NextResponse.json(
            { error : "Corrected JSON is required to edit and approval"},
            { status : 400 },
        )
    }

    const parsedCorrectedJson = ClaimExtractionSchema.safeParse(body.correctedJson);
    if(!parsedCorrectedJson.success){
        return NextResponse.json(
            { error : "Corrected JSON does not match ClaimExtractionSchema" },
            { status : 400 },
        )
    }
    
    const {
        normalizedClaim,
        correctedValidationForReview,
        hasBlockingIssues,
    } = buildHumanReviewedClaim(parsedCorrectedJson.data);

    if(hasBlockingIssues){
        return NextResponse.json(
            { error : "Corrected JSON still has blocking issues. Fix the missing fields, conflicts, required evidence for approval.",
                validationResult : correctedValidationForReview,
            },
            { status : 400 },
        )
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

    if(task.status !== ReviewTaskStatus.IN_REVIEW){
        return NextResponse.json(
            { error : `Edit and approve can only be done when status is IN_REVIEW. Current status: ${task.status}`},
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
                status : ReviewTaskStatus.EDITED_AND_APPROVED,
                completedAt : new Date(),
            }
        });

        if(claimed.count !== 1){
            return null;
        }

        const decision = await tx.reviewDecision.create({
            data : {
                taskId,
                decision : ReviewDecisionType.EDIT_AND_APPROVE,
                correctedJson : toPrismaJson(normalizedClaim),
                correctedValidationJson : toPrismaJson(correctedValidationForReview),
                reviewerName,
                notes,
            }
        });

        await tx.reviewEvent.create({
            data : {
                taskId,
                type : ReviewEventType.REVIEW_EDITED_AND_APPROVED,
                message : "Human reviewer edited the extraction result and approved the corrected JSON.",
                metadata : toPrismaJson({
                    runId : task.runId,
                    previousStatus : task.status,
                    newStatus : ReviewTaskStatus.EDITED_AND_APPROVED,
                    decision : ReviewDecisionType.EDIT_AND_APPROVE,
                    decisionId : decision.id,
                    humanReviewValidated : true,
                    correctedValidation: correctedValidationForReview,
                    reviewerName : reviewerName ?? null,
                })
            }
        })

        return tx.reviewTask.findUniqueOrThrow({
            where : {
                id : taskId,
            },
            include : reviewTaskInclude,
        });
    });

    if(!updatedTask){
        return NextResponse.json(
            { error : "Review task was already completed by another action." },
            { status : 409 },
        )
    }
    
    const latestDecisionId = updatedTask.decisions[0]?.id;

    let memoryLearning = null;

    if (latestDecisionId) {
        memoryLearning = await learnFromReviewDecision(latestDecisionId);
    }

    return NextResponse.json({
        reviewTask: updatedTask,
        memoryLearning,
    });
}
import { prisma, ReviewDecisionType, ReviewEventType, ReviewTaskStatus, Prisma } from "@repo/db";
import { NextResponse } from "next/server";
import { ClaimExtractionSchema } from "@repo/shared/schemas";
import { buildHumanReviewedClaim } from "../../../../../lib/review/build-human-reviewed-claim";
import { learnFromReviewDecision } from "../../../../../lib/memory/learn-from-review-decision";

type Params = {
    params : Promise<{
        taskId : string;
    }>;
}

type ApproveRequestBody = {
    reviewerName? : string,
    notes? : string,
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


/*

who approved
what decision was made
which run/document it belongs to
which JSON became the approved version
what state transition happened

*/

export async function POST(request : Request, { params } : Params) {
    const { taskId } = await params;

    let body : ApproveRequestBody = {};

    try{
        body = await request.json();
    }catch{
        body = {};
    }

    const reviewerName = getOptionalString(body.reviewerName);
    const notes = getOptionalString(body.notes);

    const task = await prisma.reviewTask.findUnique({
        where : {
            id : taskId,
        },
        include : {
            run : {
                include : {
                    document : true,
                },
            },
        },
    });

    if(!task){
        return NextResponse.json(
            { error : "Review task not found."},
            { status : 404 },
        )
    }

    if(task.status != ReviewTaskStatus.IN_REVIEW){
        return NextResponse.json(
            { error : `Approval can only be done when status is IN_REVIEW. Current status : ${task.status}`},
            { status : 409 },
        )
    }

    if (task.run.extractedJson === null) {
        return NextResponse.json(
            { error: "Extraction run has no extractedJson to approve." },
            { status: 400 },
        );
    }

    const parsedExtractedJson = ClaimExtractionSchema.safeParse(task.run.extractedJson);
    if(!parsedExtractedJson.success){
        return NextResponse.json(
            { 
                error : "Existing extraction JSON does not match ClaimExtractionSchema",
                issues : parsedExtractedJson.error.issues,
            },
            { status : 400 },
        )
    }

    const {
        normalizedClaim,
        correctedValidationForReview,
        hasBlockingIssues,
        } = buildHumanReviewedClaim(parsedExtractedJson.data);

        if (hasBlockingIssues) {
        return NextResponse.json(
            {
            error:
                "This task still has blocking validation issues. Use Edit & approve after correcting the JSON, or Request more info.",
                validationResult: correctedValidationForReview,
            },
            { status: 400 },
        );
    }

    const updatedTask = await prisma.$transaction(async (tx) => {
        const claimed = await tx.reviewTask.updateMany({
            where: {
                id: taskId,
                status: ReviewTaskStatus.IN_REVIEW,
            },
            data: {
                status: ReviewTaskStatus.APPROVED,
                completedAt: new Date(),
            },
        });

        if (claimed.count !== 1) {
            return null;
        }
        
        const decision = await tx.reviewDecision.create({
            data : {
                taskId,
                decision : ReviewDecisionType.APPROVE_AS_IS,
                correctedJson : toPrismaJson(normalizedClaim),
                correctedValidationJson: toPrismaJson(correctedValidationForReview),
                reviewerName,
                notes,
            }
        });

        await tx.reviewEvent.create({
            data : {
                taskId,
                type : ReviewEventType.REVIEW_APPROVED_AS_IS,
                message : "Review task approved without changes.",
                metadata : toPrismaJson({
                    runId : task.run.id,
                    documentId : task.run.document.id,
                    previousStatus : task.status,
                    newStatus : ReviewTaskStatus.APPROVED,
                    decision : ReviewDecisionType.APPROVE_AS_IS,
                    decisionId : decision.id,
                    approvedJsonSource : "extractionRun.extractedJson",
                    hasCorrectedJson : true,
                    reviewerName : reviewerName ?? null,
                    correctedValidation: correctedValidationForReview,
                    humanReviewValidated: true,
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

    const latestDecisionId = updatedTask.decisions[0]?.id;

    let memoryLearning = null;

    if (latestDecisionId) {
        memoryLearning = await learnFromReviewDecision(latestDecisionId);
    }

    return NextResponse.json({ 
        reviewTask : updatedTask,
        memoryLearning,
     });

}
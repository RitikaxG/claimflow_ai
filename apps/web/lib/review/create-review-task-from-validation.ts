import { Prisma, ReviewEventType, ReviewPriority, ReviewTaskStatus } from "@repo/db";
import { ClaimValidationResult } from "@repo/shared/schemas";

function toPrismaJson(value : unknown) : Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

type CreateReviewTaskFromValidationInput = {
    run : {
        id : string,
    };
    validationResult : ClaimValidationResult;
    tx : Prisma.TransactionClient;
};

export async function createReviewTaskFromValidation({
    run,
    validationResult,
    tx,
}: CreateReviewTaskFromValidationInput) {
    const reasonJson = {
        missingFields : validationResult.missingFields,
        conflicts : validationResult.conflicts,
        warnings : validationResult.warnings,
        requiredEvidence : validationResult.requiredEvidence,
        sourceFinalStatus : validationResult.finalStatus,
    };

    return tx.reviewTask.upsert({
        where : {
            runId : run.id,
        },
        create : {
            runId : run.id,
            status : ReviewTaskStatus.PENDING,
            priority : ReviewPriority.NORMAL,
            reasonJson : toPrismaJson(reasonJson),
            events : {
                create : {
                    type : ReviewEventType.REVIEW_TASK_CREATED,
                    message : "Review task created from validation result.",
                    metadata : toPrismaJson({
                        sourceFinalStatus : validationResult.finalStatus,
                        missingFieldsCount : validationResult.missingFields.length,
                        conflictsCount : validationResult.conflicts.length,
                        warningsCount : validationResult.warnings.length,
                        requiredEvidenceCount : validationResult.requiredEvidence.length
                    }),
                },
            },
        },
        update : {
            reasonJson : toPrismaJson(reasonJson),
        }
    })
}
import { ExtractionEventType, prisma, Prisma } from "@repo/db";
import { NextResponse } from "next/server";
import { validateClaimExtraction } from "@repo/shared/validation";

type Params = {
    params : Promise<{ 
        runId : string
    }>;
};

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown validation error.";
}

export async function POST(_request : Request, { params } : Params ){
    const { runId } = await params;

    try{
        const run = await prisma.extractionRun.findUnique({
            where : { id : runId },
            include : {
                document : true,
            }
        });

        if(!run){
            return NextResponse.json(
                { error : "Run not found."},
                { status : 404 },
            );
        }

        if(run.document.deletedAt){
            return NextResponse.json(
                { error : "This document has been deleted and cannot be processed."},
                { status : 400 },
            )
        }

        if(run.status !== "VALIDATING"){
            return NextResponse.json(
                { error : `Validation can only start from VALIDATING status. Current status : ${run.status}`},
                { status : 409 },
            )
        }

        if(!run.extractedJson){
            return NextResponse.json(
                { error : "Run does not have extractedJson to validate."},
                { status : 400 },
            );
        }

        const validationResult = validateClaimExtraction(run.extractedJson);

        const updatedRun = await prisma.$transaction(async (tx) => {
            await tx.extractionEvent.create({
                data : {
                    runId : run.id,
                    type : ExtractionEventType.VALIDATION_STARTED,
                    message : "Claim validation started.",
                    metadata : {
                        documentId : run.document.id,
                        sourceType : run.document.sourceType,
                        schemaVersion : run.schemaVersion,
                    },
                },
            });

            await tx.extractionEvent.create({
                data : {
                    runId : run.id,
                    type : ExtractionEventType.VALIDATION_COMPLETED,
                    message : "Claim validation completed.",
                    metadata : {
                        finalStatus : validationResult.finalStatus,
                        missingFieldsCount : validationResult.missingFields.length,
                        conflictsCount : validationResult.conflicts.length,
                        warningsCount : validationResult.warnings.length,
                        requiredEvidenceCount : validationResult.requiredEvidence.length,
                    },
                },
            });     
            
            if(validationResult.missingFields.length > 0){
                await tx.extractionEvent.create({
                    data : {
                        runId : run.id,
                        type : ExtractionEventType.MISSING_FIELDS_DETECTED,
                        message : "Missing required claim fields detected.",
                        metadata : {
                            missingFields : validationResult.missingFields,
                        },
                    },
                });
            }

            if(validationResult.conflicts.length > 0){
                await tx.extractionEvent.create({
                    data : {
                        runId : run.id,
                        type : ExtractionEventType.CONFLICTS_DETECTED,
                        message : "Claim validation conflicts detected.",
                        metadata : {
                            conflicts : validationResult.conflicts,
                        },
                    },
                });
            }
            
            await tx.extractionEvent.create({
                data : {
                    runId : run.id,
                    type : 
                        validationResult.finalStatus === "COMPLETED"
                        ? ExtractionEventType.RUN_COMPLETED
                        : ExtractionEventType.RUN_NEEDS_REVIEW,
                    message : 
                        validationResult.finalStatus === "COMPLETED"
                        ? "Run completed successfully."
                        : "Run requires human review.",
                    metadata : {
                        finalStatus : validationResult.finalStatus,
                        requiredEvidence : validationResult.requiredEvidence,
                    },
                },
            });

            return tx.extractionRun.update({
                where : { id : run.id },
                data : {
                    status : validationResult.finalStatus,
                    validationJson : toPrismaJson(validationResult),
                    missingFieldsJson : toPrismaJson(validationResult.missingFields),
                },
                include : {
                    document : true,
                    events : {
                        orderBy : {
                            createdAt : "asc",
                        },
                    },
                },
            });
        });

        return NextResponse.json({ run : updatedRun })
    } catch(error){
        const message = getErrorMessage(error);

        await prisma.$transaction(async (tx) => {
            await tx.extractionRun.update({
                where : {id : runId },
                data : {
                    status : "FAILED",
                    errorMessage : message,
                },
            });

            await tx.extractionEvent.create({
                data : {
                    runId,
                    type : ExtractionEventType.RUN_FAILED,
                    message : "Claim validation failed.",
                    metadata : {
                        error : message,
                    },
                },
            });
        });

        return NextResponse.json(
            { error : message },
            { status : 500 },
        );
    }
}
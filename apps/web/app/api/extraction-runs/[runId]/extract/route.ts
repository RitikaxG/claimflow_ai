import { DocumentSourceType, ExtractionEventType, Prisma, prisma } from "@repo/db";
import { NextResponse } from "next/server";
import { extractClaimFromPdf, extractClaimFromEmailText, type ClaimExtractionResult } from "@repo/ai";

type Params = {
    params : Promise<{
        runId : string
    }>;
};

function toPrismaJson(value : unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getErrorMessage(error : unknown){
    if(error instanceof Error){
        return error.message;
    }

    return "Unknown extraction error.";
}

export async function POST(_request : Request, { params } : Params ){
    const { runId } = await params;

    try{
        const run = await prisma.extractionRun.findUnique({
            where : { id : runId },
            include : {
                document : true,
            },
        });

        if(!run){
            return NextResponse.json(
                { error : "Run not found" },
                { status : 404 },
            );
        }

        if(run.status !== "UPLOADED" && run.status !== "FAILED"){
            return NextResponse.json(
                { error : `Extraction can only start from UPLOADED or FAILED status. Current Status : ${run.status}`},
                { status : 409 },
            )
        }

        await prisma.$transaction(async (tx) => {
            await tx.extractionRun.update({
                where : { id : run.id },
                data : {
                    status : "EXTRACTING",
                    errorMessage : null,
                }
            });

            await tx.extractionEvent.create({
                data : {
                    runId : run.id,
                    type : ExtractionEventType.EXTRACTION_STARTED,
                    message : "AI extraction started.",
                    metadata : {
                        documentId : run.document.id,
                        sourceType : run.document.sourceType,
                        filename : run.document.filename,
                    },
                },
            });
        });

        let extractedResult: ClaimExtractionResult;

        if(run.document.sourceType === DocumentSourceType.PDF){
            if(!run.document.storagePath){
                throw new Error("PDF storage path is missing from this document");
            }

            extractedResult = await extractClaimFromPdf(run.document.storagePath);
        }
        else if(run.document.sourceType === DocumentSourceType.EMAIL_TEXT){
            if(!run.document.contentText || run.document.contentText.trim().length === 0){
                throw new Error("Content Text missing from this document");
            }

            extractedResult = await extractClaimFromEmailText(run.document.contentText);
        }
        else{
            throw new Error(`Unsupported document source type ${run.document.sourceType}`);
        }

        const updatedRun = await prisma.$transaction(async (tx) => {
            await tx.extractionEvent.create({
                data : {
                    runId : run.id,
                    type : ExtractionEventType.MODEL_RESPONSE_RECEIVED,
                    message : "Gemini returned a structured extraction response.",
                    metadata : {
                        model : extractedResult.model,
                        promptVersion : extractedResult.promptVersion,
                        overallConfidence : extractedResult.confidenceJson.overallConfidence,
                    }
                }
            });

            await tx.extractionEvent.create({
                data : {
                    runId : run.id,
                    type : ExtractionEventType.EXTRACTION_COMPLETED,
                    message : "AI extraction completed. Run is ready for validation.",
                    metadata : {
                        nextStatus : "VALIDATING",
                    }
                }
            });

            const savedRun = await tx.extractionRun.update({
                where : { id : run.id },
                data : {
                    status : "VALIDATING",
                    model : extractedResult.model,
                    promptVersion : extractedResult.promptVersion,
                    rawModelOutput : toPrismaJson(extractedResult.rawModelOutput),
                    extractedJson : toPrismaJson(extractedResult.extractedJson),
                    confidenceJson : toPrismaJson(extractedResult.confidenceJson),
                },
                include : {
                    document : true,
                    events : {
                        orderBy : {
                            createdAt : "asc",
                        }
                    }
                }
            });

            return savedRun;
        });

        return NextResponse.json(
            { run : updatedRun }
        )
    } catch(error){
        const message = getErrorMessage(error);

        await prisma.$transaction(async (tx) => {
            await tx.extractionRun.update({
                where : { id : runId },
                data : {
                    status : "FAILED",
                    errorMessage : message,
                }
            });

            await tx.extractionEvent.create({
                data : {
                    runId,
                    type : ExtractionEventType.RUN_FAILED,
                    message : "AI extraction failed.",
                    metadata : {
                        error : message,
                    }
                }
            });
        });

        return NextResponse.json(
            { error : message },
            { status : 500 },
        )
    }

}
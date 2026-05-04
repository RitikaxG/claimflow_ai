/*
Currently Accepts :
    sourceType = PDF
    sourceType = EMAIL_TEXT
*/

import { prisma, DocumentSourceType, ExtractionEventType } from "@repo/db";
import { saveUploadedFile } from "../../../../lib/storage/local-upload";
import { NextResponse } from "next/server";

export async function POST(req : Request){
    try{
        const formData = await req.formData();
        const sourceType = formData.get("sourceType");

        if(sourceType !== "PDF" && sourceType !== "EMAIL_TEXT"){
            return NextResponse.json(
                {
                    error : "sourceType must be PDF or EMAIL_TEXT"
                },
                { status : 400 }
            )
        };

        if(sourceType === "PDF"){
            const file = formData.get("file");
            if(!(file instanceof File)){
                return NextResponse.json(
                    { error : "PDF file is required" },
                    { status : 400 },
                )
            };

            const saved = await saveUploadedFile(file);

            const result = await prisma.$transaction(async (tx) => {
                const document = await tx.document.create({
                    data : {
                        filename : file.name,
                        mimeType : file.type,
                        sizeBytes : file.size,
                        storagePath : saved.storagePath,
                        sourceType : DocumentSourceType.PDF,
                    }
                });

                const run = await tx.extractionRun.create({
                    data : {
                        documentId : document.id,
                        status : "UPLOADED",
                        schemaVersion : "auto_claim_v1",
                    }
                });

                const event = await tx.extractionEvent.create({
                    data : {
                        runId : run.id,
                        type : ExtractionEventType.DOCUMENT_UPLOADED,
                        message : "PDF document uploaded and extraction run created",
                        metadata : {
                            filename : document.filename,
                            mimeType : document.mimeType,
                            sizeBytes : document.sizeBytes,
                        },
                    },
                });

                return { document, run, event };
            });

            return NextResponse.json(result, { status : 201 });
        }

        const contentText = formData.get("contentText");

        if(typeof contentText !== "string" || contentText.trim().length < 20){
            return NextResponse.json(
                { error : "Email text must be atleast 20 characters" },
                { status : 400 },
            )
        }

        const result = await prisma.$transaction(async (tx) => {
            const document = await tx.document.create({
                data : {
                    filename : `email-text-${Date.now()}.txt`,
                    mimeType : "text/plain",
                    sizeBytes : Buffer.byteLength(contentText, "utf-8"),
                    contentText,
                    sourceType : DocumentSourceType.EMAIL_TEXT,
                }
            });

            const run = await tx.extractionRun.create({
                data : {
                    documentId : document.id,
                    status : "UPLOADED",
                    schemaVersion : "auto_claim_v1",
                }
            });

            const event = await tx.extractionEvent.create({
                data : {
                    runId : run.id,
                    type : ExtractionEventType.DOCUMENT_UPLOADED,
                    message : "Email text submitted and extraction run created.",
                    metadata : {
                        sourceType : "EMAIL_TEXT",
                        sizeBytes : document.sizeBytes,
                    },
                },
            });

            return { document, run, event };
        });

        return NextResponse.json(result, { status : 201 });
    }catch(error){
        const message = error instanceof Error ? error.message : "Unknown document upload error";

        return NextResponse.json(
            { error : message },
            { status : 500 },
        )
    }
}
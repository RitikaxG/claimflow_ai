/*
Currently Accepts :
    sourceType = PDF
    sourceType = EMAIL_TEXT
*/

import { prisma, DocumentSourceType, ExtractionEventType } from "@repo/db";
import { saveUploadedFile } from "../../../../lib/storage/local-upload";
import { NextResponse } from "next/server";
import { createEmailTextHash, createSha256Hash } from "../../../../lib/storage/hash";
import { findDocumentByHash } from "../../../../lib/documents/find-document-by-hash";
import { restoreSoftDeletedDocument } from "../../../../lib/documents/restore-documents";

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

            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const contentHash = await createSha256Hash(buffer);

            const existingDocument = await findDocumentByHash({
                sourceType: DocumentSourceType.PDF,
                contentHash,
            });

            // 1. When user reuploads an existing document
            if(existingDocument && !existingDocument.deletedAt){
                const latestRun = existingDocument.runs[0] ?? null;

                if(latestRun){
                    await prisma.extractionEvent.create({
                        data : {
                            runId : latestRun.id,
                            type : ExtractionEventType.DUPLICATE_UPLOAD_DETECTED,
                            message : "Duplicate upload detected. Existing active document returned.",
                            metadata : {
                                documentId : existingDocument.id,
                                filename : existingDocument.filename,
                                uploadedFileName : file.name,
                                contentHash,
                            },
                        },
                    });
                }

                return NextResponse.json(
                    {
                        duplicate : true,
                        restored : false,
                        message : "This document was already uploaded.",
                        document : existingDocument,
                        run : latestRun,
                    },
                    { status : 200 },
                );
            }

            // 2. When user uploads document that was soft deleted.
            if(existingDocument && existingDocument.deletedAt){
                const latestRun = existingDocument.runs[0] ?? null;

                const restoredDocument = await restoreSoftDeletedDocument({
                    documentId : existingDocument.id,
                    latestRunId : latestRun?.id,
                    filename : existingDocument.filename,
                });

                return NextResponse.json({
                    duplicate : true,
                    restored : true,
                    message : "Document restored. Previous extraction and validation results are available.",
                    document : restoredDocument,
                    run : latestRun,
                },{
                    status : 200
                });
            }

            const saved = await saveUploadedFile(file, buffer);

            const result = await prisma.$transaction(async (tx) => {
                const document = await tx.document.create({
                    data : {
                        filename : file.name,
                        mimeType : file.type,
                        sizeBytes : file.size,
                        storagePath : saved.storagePath,
                        sourceType : DocumentSourceType.PDF,
                        contentHash,
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
                            contentHash,
                        },
                    },
                });

                return { document, run, event };
            });

            return NextResponse.json({
                duplicate : false,
                restored : false,
                message : "PDF uploaded. Extraction run created.",
                ...result,
            }, { status : 201 });
        }

        const contentText = formData.get("contentText");

        if(typeof contentText !== "string" || contentText.trim().length < 20){
            return NextResponse.json(
                { error : "Email text must be atleast 20 characters" },
                { status : 400 },
            )
        }

        const contentHash = createEmailTextHash(contentText);

        const existingDocument = await findDocumentByHash({
            sourceType : DocumentSourceType.EMAIL_TEXT,
            contentHash,
        });

        // 1. User submitted same email_text
        if(existingDocument && !existingDocument.deletedAt){
            const latestRun = existingDocument.runs[0] ?? null;

            if(latestRun){
                await prisma.extractionEvent.create({
                    data : {
                        runId : latestRun.id,
                        type : ExtractionEventType.DUPLICATE_UPLOAD_DETECTED,
                        message : "Duplicate email text detected. Existing active document returned.",
                        metadata : {
                            documentId : existingDocument.id,
                            filename : existingDocument.filename,
                            contentHash,
                        }
                    }
                });
            }

            return NextResponse.json(
                {
                    duplicate : true,
                    restored : false,
                    message : "The email text was already submitted.",
                    document : existingDocument,
                    run : latestRun,
                },
                { status : 200 },
            )
        }

        // 2. User submitted email_text that was soft deleted
        if(existingDocument && existingDocument.deletedAt){
            const latestRun = existingDocument.runs[0] ?? null;

            const restoredDocument = await restoreSoftDeletedDocument({
                documentId : existingDocument.id,
                latestRunId : latestRun?.id,
                filename : existingDocument.filename,
            });

            return NextResponse.json({
                duplicate : true,
                restored : true,
                message : "Email text restored. Previous extraction and validation results are available.",
                document : restoredDocument,
                run : latestRun,
            },
            { status : 200 });
        }

        const result = await prisma.$transaction(async (tx) => {
            const document = await tx.document.create({
                data : {
                    filename : `email-text-${Date.now()}.txt`,
                    mimeType : "text/plain",
                    sizeBytes : Buffer.byteLength(contentText, "utf-8"),
                    contentText,
                    sourceType : DocumentSourceType.EMAIL_TEXT,
                    contentHash,
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
                        contentHash,
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
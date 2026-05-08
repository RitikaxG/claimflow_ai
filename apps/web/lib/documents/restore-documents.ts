import { ExtractionEventType,prisma } from "@repo/db";

export async function restoreSoftDeletedDocument(params : {
    documentId : string,
    latestRunId? : string,
    filename : string,
}){
    return prisma.$transaction(async (tx) => {
        const restoredDocument = await tx.document.update({
            where : {
                id : params.documentId,
            },
            data : {
                deletedAt : null,
                deletedReason : null,
            }
        });

        if(params.latestRunId){
            await tx.extractionEvent.create({
                data : {
                    runId : params.latestRunId,
                    type : ExtractionEventType.DOCUMENT_RESTORED,
                    message : "Document was restored from soft delete.",
                    metadata : {
                        documentId : params.documentId,
                        filename : params.filename,
                    }
                }
            });
        }

        const restoredLatestRun = await tx.extractionRun.findFirst({
            where : {
                documentId : restoredDocument.id,
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

        return {
            document : restoredDocument,
            run : restoredLatestRun,
        };
    })
}
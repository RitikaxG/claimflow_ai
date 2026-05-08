import { prisma, type DocumentSourceType } from "@repo/db";

export async function findDocumentByHash(params : {
    sourceType : DocumentSourceType,
    contentHash : string,
}) {
    const include = {
        runs : {
            orderBy : {
                createdAt : "desc" as const
            }
        },
        take : 1,
        include : {
            document : true,
            events : {
                orderBy : {
                    createdAt : "asc" as const
                },
            },
        },
    };

    const activeDocument = await prisma.document.findFirst({
        where : {
            sourceType : params.sourceType,
            contentHash : params.contentHash,
            deletedAt : null,
        },
        orderBy : {
            createdAt : "desc"
        },
        include,
    });

    if(activeDocument){
        return activeDocument;
    }

    return prisma.document.findFirst({
        where : {
            sourceType : params.sourceType,
            contentHash : params.contentHash,
            deletedAt : {
                not : null,
            }
        },
        orderBy : {
            createdAt : "desc",
        },
        include,
    });
}
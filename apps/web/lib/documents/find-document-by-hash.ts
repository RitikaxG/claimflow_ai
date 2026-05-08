import { prisma, type DocumentSourceType } from "@repo/db";

export async function findDocumentByHash(params : {
    sourceType : DocumentSourceType,
    contentHash : string,
}) {
    return prisma.document.findFirst({
        where : {
            sourceType : params.sourceType,
            contentHash : params.contentHash
        },
        orderBy : {
            createdAt : "desc"
        },
        include : {
            runs : {
                orderBy : {
                    createdAt : "desc",
                },
                take : 1,
                include : {
                    document : true,
                    events : {
                        orderBy : {
                            createdAt : "asc",
                        }
                    }
                }
            }
        },
    })
}
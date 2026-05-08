import { ExtractionEventType, prisma } from "@repo/db";
import { NextRequest, NextResponse } from "next/server";

type Params = {
    params : Promise<{
        documentId : string
    }>;
}

function getErrorMessage(error : unknown){
    if(error instanceof Error){
        return error.message;
    }

    return "Unknown delete document error.";
}

export async function DELETE( req : NextRequest, { params } : Params ){
    const { documentId } = await params;
    try{
        const body = await req.json().catch(() => null);

        const deletedReason = typeof body?.deletedReason === "string" &&
            body.deletedReason.trim().length > 0
            ? body.deletedReason.trim()
            : "Document no longer required.";
        
        const document = await prisma.document.findUnique({
            where : { id : documentId },
            include : {
                runs : {
                    orderBy : {
                        createdAt : "desc"
                    }
                }
            }
        });

        if(!document){
            return NextResponse.json(
                { error : "Document not found."},
                { status : 404 },
            );
        }
        
        if(document.deletedAt){
            return NextResponse.json(
                { 
                    document,
                    alreadyDeleted : true,
                    message : "Document was already soft deleted",
                },
                { status : 200 },
            );
        }

        const result = await prisma.$transaction(async (tx) => {
            const updatedDocument = await tx.document.update({
                where : { id : documentId },
                data : {
                    deletedAt : new Date(),
                    deletedReason,
                },
            });

            for(const run of document.runs){
                await tx.extractionEvent.create({
                    data : {
                        runId : run.id,
                        type : ExtractionEventType.DOCUMENT_SOFT_DELETED,
                        message : "Document soft deleted and hidden from active workflow.",
                        metadata : {
                            documentId : updatedDocument.id,
                            filename : updatedDocument.filename,
                            deletedReason,
                        },
                    },
                });
            }

            return {
                document : updatedDocument,
                affectedRunIds : document.runs.map((run) => run.id),
            }
        })

        return NextResponse.json(
            { 
                ...result,
                message : "Document soft deleted successfully",
            },
            { status : 200 },
        )
    } catch(error){
        return NextResponse.json(
            { error : getErrorMessage(error) },
            { status : 500 },
        )
    }
}
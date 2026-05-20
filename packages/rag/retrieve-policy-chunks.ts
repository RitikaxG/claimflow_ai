// query string -> embedding -> pg vector topK search

import { embedText, formatQuestionForEmbedding } from "./embed-policy-text";
import type { RetrievalQueryPlanItem, RetrievedPolicyChunk } from "./retrieval-types";
import { toPgVector } from "./vector-sql";
import { prisma } from "@repo/db";

type RetrievedPolicyChunkRow = Omit<
    RetrievedPolicyChunk,
    "sourceQuery" | "sourceIntent"
>;

export async function retrievePolicyChunks ({
    query,
    intent,
    topK
} : RetrievalQueryPlanItem ) : Promise<RetrievedPolicyChunk[]>{
    const safeTopK = Math.max(1,Math.min(topK,20));
    
    const embedding = await embedText(formatQuestionForEmbedding(query));
    const vector = toPgVector(embedding);

    const rows = await prisma.$queryRawUnsafe<RetrievedPolicyChunkRow[]>(`
        SELECT
            pc.id AS "chunkId",
            pc."policyDocumentId",
            pc."clauseId",
            pc."sectionTitle",
            pd.title AS "policyTitle",
            pc.text,
            1 - (pc.embedding <=> $1::vector) AS similarity
        FROM policy_chunks pc
        JOIN policy_documents pd
            ON pd.id = pc."policyDocumentId"
        WHERE pc.embedding IS NOT NULL
        ORDER BY pc.embedding <=> $1::vector
        LIMIT $2;:int;
        `,vector,safeTopK);

    return rows.map((row) => ({
        ...row,
        similarity : Number(row.similarity),
        sourceQuery : query,
        sourceIntent : intent,
    }));
}
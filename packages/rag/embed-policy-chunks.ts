/*
- Read all policy_chunks where embedding IS NULL.
- Join each chunk with policy_documents to get policy title.
- Format each chunk using formatPolicyChunkForEmbedding().
- Generate a 768-dim embedding.
- Update policy_chunks.embedding using raw SQL.
- Print progress.
- Be safe to re-run.
*/

import { prisma } from "@repo/db";
import { embedText, formatPolicyChunkForEmbedding } from "./embed-policy-text";
import { toPgVector } from "./vector-sql";

type PolicyChunkToEmbedRow = {
    id : string,
    clauseId : string | null;
    sectionTitle : string | null;
    text : string;
    chunkIndex : number;
    policyDocumentId : string;
    policyTitle : string;
};

async function main(){
    const chunks = await prisma.$queryRawUnsafe<PolicyChunkToEmbedRow[]>(`
        SELECT
        pc.id,
        pc."clauseId",
        pc."sectionTitle",
        pc.text,
        pc."chunkIndex",
        pc."policyDocumentId",
        pd.title AS "policyTitle"
        FROM policy_chunks pc
        JOIN policy_documents pd
        ON pd.id = pc."policyDocumentId"
        WHERE pc.embedding IS NULL
        ORDER BY pc."policyDocumentId" ASC, pc."chunkIndex" ASC;
        `);

    console.log(`Found ${chunks.length} policy chunks without embeddings`);

    for(const chunk of chunks){
        const embeddingInput = formatPolicyChunkForEmbedding({
            title : chunk.policyTitle,
            clauseId : chunk.clauseId,
            sectionTitle : chunk.sectionTitle,
            text : chunk.text,
        });

        const embedding = await embedText(embeddingInput);
        const vector = toPgVector(embedding);

        await prisma.$executeRawUnsafe(`
            UPDATE policy_chunks
            SET embedding = $1::vector
            WHERE id = $2;
            `,
            vector,
            chunk.id,
        );

        console.log(`Embedded chunk ${chunk.chunkIndex} : ${chunk.clauseId ?? chunk.id} - ${chunk.sectionTitle ?? "Untitled"}`);

        console.log("Policy chunk embedding complete");
    }
}

main()
    .catch((error) => {
        console.error("Failed to embed policy chunks");
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
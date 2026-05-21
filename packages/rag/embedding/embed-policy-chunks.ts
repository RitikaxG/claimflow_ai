import { prisma } from "@repo/db";
import { embedText, formatPolicyChunkForEmbedding } from "./embed-policy-text";
import { toPgVector } from "../utils/vector-sql";

type PolicyChunkToEmbedRow = {
  id: string;
  clauseId: string | null;
  sectionTitle: string | null;
  text: string;
  chunkIndex: number;
  policyDocumentId: string;
  policyTitle: string;
};

export type EmbedMissingPolicyChunksOptions = {
  log?: boolean;
};

export type EmbedMissingPolicyChunksResult = {
  foundCount: number;
  embeddedCount: number;
};

export async function embedMissingPolicyChunks(
  options: EmbedMissingPolicyChunksOptions = {},
): Promise<EmbedMissingPolicyChunksResult> {
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

  if (options.log) {
    console.log(`Found ${chunks.length} policy chunks without embeddings`);
  }

  if (chunks.length === 0) {
    if (options.log) {
      console.log("No embedding work needed. All policy chunks already have embeddings.");
    }

    return {
      foundCount: 0,
      embeddedCount: 0,
    };
  }

  let embeddedCount = 0;

  for (const chunk of chunks) {
    const embeddingInput = formatPolicyChunkForEmbedding({
      title: chunk.policyTitle,
      clauseId: chunk.clauseId,
      sectionTitle: chunk.sectionTitle,
      text: chunk.text,
    });

    const embedding = await embedText(embeddingInput);
    const vector = toPgVector(embedding);

    await prisma.$executeRawUnsafe(
      `
        UPDATE policy_chunks
        SET embedding = $1::vector
        WHERE id = $2;
      `,
      vector,
      chunk.id,
    );

    embeddedCount += 1;

    if (options.log) {
      console.log(
        `Embedded ${embeddedCount}/${chunks.length}: chunk ${
          chunk.chunkIndex
        } | ${chunk.clauseId ?? chunk.id} - ${chunk.sectionTitle ?? "Untitled"}`,
      );
    }
  }

  if (options.log) {
    console.log("");
    console.log("Policy chunk embedding complete.");
    console.log(`Embedded chunks: ${embeddedCount}`);
  }

  return {
    foundCount: chunks.length,
    embeddedCount,
  };
}

async function main() {
  await embedMissingPolicyChunks({ log: true });
}

if (import.meta.main) {
  main()
    .catch((error) => {
      console.error("Failed to embed policy chunks");
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
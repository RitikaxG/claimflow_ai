import { prisma } from "@repo/db";
import { embedText, formatQuestionForEmbedding } from "./embed-policy-text";
import { toPgVector } from "./vector-sql";

type VectorSearchMatch = {
  chunkId: string;
  clauseId: string | null;
  sectionTitle: string | null;
  policyTitle: string;
  text: string;
  similarity: number;
};

async function main() {
  const question =
    process.argv.slice(2).join(" ") ||
    "Is theft claim ready for approval if FIR number is missing?";

  const embeddedRows = await prisma.$queryRawUnsafe<
    Array<{ embeddedCount: bigint }>
  >(`
    SELECT COUNT(*) AS "embeddedCount"
    FROM policy_chunks
    WHERE embedding IS NOT NULL;
  `);

  const embeddedCount = Number(embeddedRows[0]?.embeddedCount ?? 0);

  if (embeddedCount === 0) {
    throw new Error(
      "No embedded policy chunks found. Run `bun run rag:embed-policies` first.",
    );
  }

  const embedding = await embedText(formatQuestionForEmbedding(question));
  const vector = toPgVector(embedding);

  const matches = await prisma.$queryRawUnsafe<VectorSearchMatch[]>(
    `
    SELECT
      pc.id AS "chunkId",
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
    LIMIT 5;
    `,
    vector,
  );

  console.log(`Question: ${question}`);
  console.log(`Embedded chunks: ${embeddedCount}`);
  console.log("");
  
  console.table(
    matches.map((match, index) => ({
        rank: index + 1,
        clauseId: match.clauseId,
        sectionTitle: match.sectionTitle,
        policyTitle: match.policyTitle,
        similarity: Number(match.similarity).toFixed(4),
    })),
  );
}

main()
  .catch((error) => {
    console.error("Vector search smoke test failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
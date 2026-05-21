// packages/rag/scripts/smoke-test-policy-retrieval.ts

import { prisma } from "@repo/db";
import {
  retrievePolicyEvidence,
  type MergedRetrievedPolicyChunk,
  type RetrievalQueryPlanItem,
} from "../index";

async function main() {
  const question =
    process.argv.slice(2).join(" ") ||
    "Is this theft claim ready for approval if FIR number is missing?";

  const result = await retrievePolicyEvidence({
    question,
    topKFinal: 5,
  });

  console.log(`Question : ${result.question}`);
  console.log(`Status : ${result.retrievalStatus}`);
  console.log(`Reason : ${result.reason}`);
  console.log("");

  console.log("Query Plan:");
  console.table(
    result.queryPlan.map((item: RetrievalQueryPlanItem) => ({
      intent: item.intent,
      topK: item.topK,
      query: item.query,
    })),
  );

  console.log("");
  console.log("Matches:");
  console.table(
    result.matches.map((match: MergedRetrievedPolicyChunk, index: number) => ({
      rank: index + 1,
      clauseId: match.clauseId,
      sectionTitle: match.sectionTitle,
      bestIntent: match.bestIntent,
      similarity: match.similarity.toFixed(4),
      matchedQueryCount: match.matchedQueries.length,
    })),
  );
}

main()
  .catch((error) => {
    console.error("Policy retrieval smoke test failed");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
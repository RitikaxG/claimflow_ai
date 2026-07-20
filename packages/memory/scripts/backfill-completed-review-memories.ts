import { prisma } from "@repo/db";
import { backfillCompletedReviewMemories } from "../write/backfill-completed-review-memories";

async function main() {
  const result = await backfillCompletedReviewMemories();

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

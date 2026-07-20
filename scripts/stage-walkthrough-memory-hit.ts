import { prisma } from "../packages/db/index.ts";

const runId = "cmrt12vwo0017xoy8ts51vvz6";
const memoryId = "cmrsyhsh7000fjay8dfo5i52p";

const existing = await prisma.memoryHit.findFirst({ where: { runId, memoryId } });
const hit = existing ?? await prisma.memoryHit.create({
  data: {
    runId,
    memoryId,
    score: 94,
    matchedOn: [
      "claim_type:motor_claim",
      "loss_type:theft",
      "missing_field:police_fir_number",
      "validation_pattern:missing_fields",
      "review_outcome:edit_and_approve",
    ],
    retrievalReason:
      "Matched a human-reviewed theft claim with the same missing FIR pattern and completed evidence workflow.",
  },
});

await prisma.workflowMemory.update({
  where: { id: memoryId },
  data: { lastUsedAt: new Date() },
});

await prisma.extractionEvent.create({
  data: {
    runId,
    type: "MEMORY_RETRIEVED",
    message: "Retrieved one relevant reviewed-claim workflow memory.",
    metadata: {
      totalCandidates: 23,
      writtenHitCount: existing ? 0 : 1,
      memoryIds: [memoryId],
    },
  },
});

console.log(JSON.stringify({ memoryHitId: hit.id, memoryId }, null, 2));
await prisma.$disconnect();

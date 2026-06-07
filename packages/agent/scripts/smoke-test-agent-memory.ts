import assert from "node:assert/strict";
import { prisma } from "@repo/db";
import { loadWeek5MemorySeed } from "@repo/memory";
import { runAgentStep } from "../runner/run-agent-step";

async function main() {
  console.log("Week 5 Day 5 agent memory smoke test started");

  await loadWeek5MemorySeed({
    log: false,
  });

  let documentId: string | null = null;

  try {
    const document = await prisma.document.create({
      data: {
        filename: "week5-day5-agent-memory-smoke.json",
        mimeType: "application/json",
        sizeBytes: 1,
        sourceType: "EMAIL_TEXT",
        contentText: "Week 5 Day 5 agent memory smoke test",
      },
    });

    documentId = document.id;

    const run = await prisma.extractionRun.create({
      data: {
        documentId: document.id,
        status: "NEEDS_REVIEW",
        extractedJson: {
          customerId: "CUST-W5-001",
          claimNumber: "CLM-W5-D5-SMOKE",
          insuredName: "Dev Arora",
          policyNumber: null,
          lossType: "own_damage",
        },
        validationJson: {
          isValid: false,
          missingFields: ["policyNumber"],
          requiredEvidence: [],
          conflicts: [],
        },
        missingFieldsJson: ["policyNumber"],
      },
    });

    const result = await runAgentStep(run.id);

    assert.equal(
      result.proposedAction.action,
      "DRAFT_INFORMATION_REQUEST",
      `Expected DRAFT_INFORMATION_REQUEST, got ${result.proposedAction.action}`,
    );

    const usedMemoryHit = await prisma.memoryHit.findFirst({
      where: {
        runId: run.id,
        usedByAgent: true,
        agentActionLogId: {
          not: null,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    assert(
      usedMemoryHit,
      "Expected at least one MemoryHit to be marked usedByAgent=true.",
    );

    const linkedAction = await prisma.agentActionLog.findUnique({
      where: {
        id: usedMemoryHit.agentActionLogId!,
      },
    });

    assert(linkedAction, "Expected MemoryHit to link to an AgentActionLog.");

    console.log("Week 5 Day 5 agent memory smoke test passed");
    console.log(`runId: ${run.id}`);
    console.log(`memoryHitId: ${usedMemoryHit.id}`);
    console.log(`agentActionLogId: ${usedMemoryHit.agentActionLogId}`);
    console.log(`proposedAction: ${result.proposedAction.action}`);
  } finally {
    if (documentId) {
      await prisma.document
        .delete({
          where: {
            id: documentId,
          },
        })
        .catch(() => undefined);
    }
  }
}

if (import.meta.main) {
  main()
    .catch((error) => {
      console.error("Week 5 Day 5 agent memory smoke test failed");
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
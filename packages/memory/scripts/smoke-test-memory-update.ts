import assert from "node:assert/strict";
import { prisma, Prisma } from "@repo/db";
import { updateMemoryFromReviewOutcome } from "../update/update-memory-from-review-outcome";

type ReviewDecisionValue =
  | "APPROVE_AS_IS"
  | "EDIT_AND_APPROVE"
  | "REJECT"
  | "REQUEST_MORE_INFO";

type WorkflowMemoryKindValue =
  | "HUMAN_CORRECTION"
  | "PRIOR_REJECTION"
  | "PRIOR_REVIEW_DECISION"
  | "CLAIMANT_PATTERN"
  | "VENDOR_PATTERN"
  | "POLICY_HISTORY"
  | "RECURRING_ERROR_PATTERN";

type WorkflowMemoryRiskLevelValue = "LOW" | "MEDIUM" | "HIGH";

type WorkflowMemoryStatusValue =
  | "ACTIVE"
  | "STRENGTHENED"
  | "WEAKENED"
  | "SUPERSEDED"
  | "RETIRED";

type MatchSignal = {
  type: string;
  value: string;
  points: number;
};

const RUN_LABEL = `week5-memory-update-smoke-${Date.now()}`;

const createdDocumentIds = new Set<string>();
const createdMemoryIds = new Set<string>();

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function assertConfidenceEquals(
  actual: number,
  expected: number,
  message: string,
) {
  assert.equal(round2(actual), round2(expected), message);
}

async function createWorkflowMemory(input: {
  label: string;
  kind: WorkflowMemoryKindValue;
  riskLevel: WorkflowMemoryRiskLevelValue;
  confidence: number;
  status?: WorkflowMemoryStatusValue;
  entityType: string | null;
  entityId: string | null;
  fieldPath: string | null;
  summary?: string;
  safeUse?: string;
  mustNotDo?: string[];
  tags?: string[];
}) {
  const memory = await prisma.workflowMemory.create({
    data: {
      kind: input.kind,
      status: input.status ?? "ACTIVE",
      riskLevel: input.riskLevel,
      confidence: input.confidence,

      summary:
        input.summary ??
        `[${input.label}] Smoke memory for Week 5 update lifecycle.`,
      safeUse:
        input.safeUse ??
        "Use this memory only as routing context for reviewer verification.",
      mustNotDo: toPrismaJson(
        input.mustNotDo ?? [
          "do not overwrite extractedJson",
          "do not approve from memory",
          "do not reject from memory",
        ],
      ),

      entityType: input.entityType,
      entityId: input.entityId,
      fieldPath: input.fieldPath,
      tags: toPrismaJson(input.tags ?? ["week5_memory_update_smoke"]),

      evidenceJson: toPrismaJson({
        smokeTest: true,
        label: input.label,
        runLabel: RUN_LABEL,
      }),

      confirmedCount: 0,
      contradictedCount: 0,
    },
  });

  createdMemoryIds.add(memory.id);

  return memory;
}

async function createRunWithReviewDecision(input: {
  label: string;
  decision: ReviewDecisionValue;
  extractedJson?: Record<string, unknown>;
  correctedJson?: Record<string, unknown> | null;
  correctedValidationJson?: Record<string, unknown> | null;
  notes?: string;
}) {
  const document = await prisma.document.create({
    data: {
      filename: `${RUN_LABEL}-${input.label}.json`,
      mimeType: "application/json",
      sizeBytes: 1,
      sourceType: "EMAIL_TEXT",
      contentText: `Week 5 memory update smoke fixture: ${input.label}`,
    },
  });

  createdDocumentIds.add(document.id);

  const extractedJson = input.extractedJson ?? {
    customerId: `CUST-${input.label}`,
    claimNumber: `CLM-${input.label}`,
    insuredName: "Smoke Test Claimant",
    policyNumber: "POL-OLD",
    lossType: "own_damage",
  };

  const run = await prisma.extractionRun.create({
    data: {
      documentId: document.id,
      status: "NEEDS_REVIEW",
      extractedJson: toPrismaJson(extractedJson),
      validationJson: toPrismaJson({
        isValid: false,
        missingFields: [],
        conflicts: [],
        smokeTest: true,
      }),
      missingFieldsJson: toPrismaJson([]),
    },
  });

  const task = await prisma.reviewTask.create({
    data: {
      runId: run.id,
      status: "IN_REVIEW",
      priority: "NORMAL",
      reasonJson: toPrismaJson({
        smokeTest: true,
        label: input.label,
      }),
      startedAt: new Date(),
    },
  });

  const decision = await prisma.reviewDecision.create({
    data: {
      taskId: task.id,
      decision: input.decision,
      correctedJson:
        input.correctedJson === undefined
          ? toPrismaJson(extractedJson)
          : input.correctedJson === null
            ? undefined
            : toPrismaJson(input.correctedJson),
      correctedValidationJson:
        input.correctedValidationJson === undefined
          ? toPrismaJson({
              isValid: true,
              missingFields: [],
              conflicts: [],
              smokeTest: true,
            })
          : input.correctedValidationJson === null
            ? undefined
            : toPrismaJson(input.correctedValidationJson),
      reviewerName: "Memory Update Smoke Tester",
      notes:
        input.notes ??
        `Smoke review decision for ${input.label}: ${input.decision}`,
    },
  });

  return {
    document,
    run,
    task,
    decision,
  };
}

async function createUsedMemoryHit(input: {
  memoryId: string;
  runId: string;
  score: number;
  matchedOn: MatchSignal[];
  retrievalReason?: string;
}) {
  return prisma.memoryHit.create({
    data: {
      memoryId: input.memoryId,
      runId: input.runId,
      score: input.score,
      matchedOn: toPrismaJson(input.matchedOn),
      retrievalReason:
        input.retrievalReason ??
        `Smoke memory hit matched on ${input.matchedOn
          .map((item) => item.type)
          .join(", ")}`,
      usedByAgent: true,
    },
  });
}

async function getMemoryOrThrow(memoryId: string) {
  const memory = await prisma.workflowMemory.findUnique({
    where: {
      id: memoryId,
    },
  });

  assert(memory, `Expected WorkflowMemory ${memoryId} to exist.`);

  return memory;
}

async function getLatestMemoryUpdateOrThrow(input: {
  memoryId: string;
  updateType?: string;
}) {
  const update = await prisma.memoryUpdate.findFirst({
    where: {
      memoryId: input.memoryId,
      ...(input.updateType ? { updateType: input.updateType as never } : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  assert(
    update,
    `Expected MemoryUpdate for memory=${input.memoryId} updateType=${
      input.updateType ?? "ANY"
    }.`,
  );

  return update;
}

async function printMemoryBehavior(input: {
  title: string;
  before: {
    status: string;
    confidence: number;
    confirmedCount: number;
    contradictedCount: number;
    supersededByMemoryId: string | null;
  };
  after: {
    status: string;
    confidence: number;
    confirmedCount: number;
    contradictedCount: number;
    supersededByMemoryId: string | null;
  };
  updateRows: Array<{
    updateType: string;
    beforeStatus: string | null;
    afterStatus: string | null;
    confidenceDelta: number | null;
    note: string | null;
  }>;
  result: unknown;
}) {
  console.log(`\n${input.title}`);
  console.log("-".repeat(input.title.length));

  console.log("Before:");
  console.log(
    JSON.stringify(
      {
        status: input.before.status,
        confidence: round2(input.before.confidence),
        confirmedCount: input.before.confirmedCount,
        contradictedCount: input.before.contradictedCount,
        supersededByMemoryId: input.before.supersededByMemoryId,
      },
      null,
      2,
    ),
  );

  console.log("After:");
  console.log(
    JSON.stringify(
      {
        status: input.after.status,
        confidence: round2(input.after.confidence),
        confirmedCount: input.after.confirmedCount,
        contradictedCount: input.after.contradictedCount,
        supersededByMemoryId: input.after.supersededByMemoryId,
      },
      null,
      2,
    ),
  );

  console.log("MemoryUpdate rows:");
  console.log(JSON.stringify(input.updateRows, null, 2));

  console.log("Update result:");
  console.log(JSON.stringify(input.result, null, 2));
}

async function getRecentUpdatesForMemory(memoryId: string) {
  return prisma.memoryUpdate.findMany({
    where: {
      memoryId,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      updateType: true,
      beforeStatus: true,
      afterStatus: true,
      confidenceDelta: true,
      note: true,
    },
  });
}

async function testStrengthenMemory() {
  const memory = await createWorkflowMemory({
    label: "strengthen",
    kind: "HUMAN_CORRECTION",
    riskLevel: "MEDIUM",
    confidence: 0.75,
    entityType: "CLAIMANT",
    entityId: "CUST-W5-SMOKE-STRENGTHEN",
    fieldPath: "policyNumber",
    summary: "Reviewer previously corrected policyNumber for this claimant.",
    safeUse:
      "Ask reviewer to verify policyNumber when this claimant has a similar field issue.",
    tags: ["human_verified", "policy_number_correction"],
  });

  const before = await getMemoryOrThrow(memory.id);

  const { run, decision } = await createRunWithReviewDecision({
    label: "strengthen",
    decision: "EDIT_AND_APPROVE",
    extractedJson: {
      customerId: "CUST-W5-SMOKE-STRENGTHEN",
      claimNumber: "CLM-STRENGTHEN",
      policyNumber: "POL-WRONG",
      lossType: "own_damage",
    },
    correctedJson: {
      customerId: "CUST-W5-SMOKE-STRENGTHEN",
      claimNumber: "CLM-STRENGTHEN",
      policyNumber: "POL-CORRECTED",
      lossType: "own_damage",
    },
  });

  await createUsedMemoryHit({
    memoryId: memory.id,
    runId: run.id,
    score: 40,
    matchedOn: [
      {
        type: "SAME_FIELD",
        value: "policyNumber",
        points: 30,
      },
      {
        type: "HUMAN_VERIFIED_MEMORY",
        value: "human_verified",
        points: 10,
      },
    ],
  });

  const result = await updateMemoryFromReviewOutcome({
    reviewDecisionId: decision.id,
  });

  const after = await getMemoryOrThrow(memory.id);
  const updates = await getRecentUpdatesForMemory(memory.id);

  assert.equal(after.status, "STRENGTHENED");
  assert.equal(after.confirmedCount, before.confirmedCount + 1);
  assert.equal(after.contradictedCount, before.contradictedCount);
  assertConfidenceEquals(after.confidence, before.confidence + 0.05, "confidence should increase by 0.05");

  await getLatestMemoryUpdateOrThrow({
    memoryId: memory.id,
    updateType: "STRENGTHENED",
  });

  assert.equal(result.strengthened, 1);
  assert(result.updatedMemoryIds.includes(memory.id));

  await printMemoryBehavior({
    title: "1. Strengthen memory: used MemoryHit + EDIT_AND_APPROVE same field",
    before,
    after,
    updateRows: updates,
    result,
  });
}

async function testWeakenMemory() {
  const memory = await createWorkflowMemory({
    label: "weaken",
    kind: "PRIOR_REJECTION",
    riskLevel: "HIGH",
    confidence: 0.7,
    entityType: "CLAIMANT",
    entityId: "CUST-W5-SMOKE-WEAKEN",
    fieldPath: null,
    summary: "A prior claim for this claimant was rejected.",
    safeUse:
      "Use only as a routing signal when current claim signals are similar.",
    tags: ["prior_rejection", "human_review"],
  });

  const before = await getMemoryOrThrow(memory.id);

  const { run, decision } = await createRunWithReviewDecision({
    label: "weaken",
    decision: "APPROVE_AS_IS",
    extractedJson: {
      customerId: "CUST-W5-SMOKE-WEAKEN",
      claimNumber: "CLM-WEAKEN",
      policyNumber: "POL-WEAKEN",
      lossType: "own_damage",
    },
  });

  await createUsedMemoryHit({
    memoryId: memory.id,
    runId: run.id,
    score: 45,
    matchedOn: [
      {
        type: "EXACT_CLAIMANT",
        value: "CUST-W5-SMOKE-WEAKEN",
        points: 20,
      },
      {
        type: "HIGH_RISK_MEMORY",
        value: "HIGH",
        points: 10,
      },
      {
        type: "CONFIRMED_MEMORY",
        value: "1",
        points: 10,
      },
    ],
  });

  const result = await updateMemoryFromReviewOutcome({
    reviewDecisionId: decision.id,
  });

  const after = await getMemoryOrThrow(memory.id);
  const updates = await getRecentUpdatesForMemory(memory.id);

  assert.equal(after.status, "WEAKENED");
  assert.equal(after.confirmedCount, before.confirmedCount);
  assert.equal(after.contradictedCount, before.contradictedCount + 1);
  assertConfidenceEquals(after.confidence, before.confidence - 0.1, "confidence should decrease by 0.10");

  await getLatestMemoryUpdateOrThrow({
    memoryId: memory.id,
    updateType: "WEAKENED",
  });

  assert.equal(result.weakened, 1);
  assert(result.updatedMemoryIds.includes(memory.id));

  await printMemoryBehavior({
    title: "2. Weaken memory: used risk memory + APPROVE_AS_IS",
    before,
    after,
    updateRows: updates,
    result,
  });
}

async function testRetireMemory() {
  const memory = await createWorkflowMemory({
    label: "retire",
    kind: "PRIOR_REJECTION",
    riskLevel: "HIGH",
    confidence: 0.7,
    entityType: "CLAIMANT",
    entityId: "CUST-W5-SMOKE-RETIRE",
    fieldPath: null,
    summary:
      "Prior rejection memory should be retired after two reviewer contradictions.",
    safeUse:
      "Use only as a routing signal until enough contradictions retire it.",
    tags: ["prior_rejection", "human_review"],
  });

  const before = await getMemoryOrThrow(memory.id);

  const first = await createRunWithReviewDecision({
    label: "retire-first-contradiction",
    decision: "APPROVE_AS_IS",
    extractedJson: {
      customerId: "CUST-W5-SMOKE-RETIRE",
      claimNumber: "CLM-RETIRE-1",
      policyNumber: "POL-RETIRE-1",
      lossType: "own_damage",
    },
  });

  await createUsedMemoryHit({
    memoryId: memory.id,
    runId: first.run.id,
    score: 35,
    matchedOn: [
      {
        type: "EXACT_CLAIMANT",
        value: "CUST-W5-SMOKE-RETIRE",
        points: 20,
      },
      {
        type: "HIGH_RISK_MEMORY",
        value: "HIGH",
        points: 10,
      },
    ],
  });

  const firstResult = await updateMemoryFromReviewOutcome({
    reviewDecisionId: first.decision.id,
  });

  const afterFirst = await getMemoryOrThrow(memory.id);

  assert.equal(afterFirst.status, "WEAKENED");
  assert.equal(afterFirst.contradictedCount, 1);
  assert.equal(firstResult.weakened, 1);

  const second = await createRunWithReviewDecision({
    label: "retire-second-contradiction",
    decision: "APPROVE_AS_IS",
    extractedJson: {
      customerId: "CUST-W5-SMOKE-RETIRE",
      claimNumber: "CLM-RETIRE-2",
      policyNumber: "POL-RETIRE-2",
      lossType: "own_damage",
    },
  });

  await createUsedMemoryHit({
    memoryId: memory.id,
    runId: second.run.id,
    score: 35,
    matchedOn: [
      {
        type: "EXACT_CLAIMANT",
        value: "CUST-W5-SMOKE-RETIRE",
        points: 20,
      },
      {
        type: "HIGH_RISK_MEMORY",
        value: "HIGH",
        points: 10,
      },
    ],
  });

  const secondResult = await updateMemoryFromReviewOutcome({
    reviewDecisionId: second.decision.id,
  });

  const afterSecond = await getMemoryOrThrow(memory.id);
  const updates = await getRecentUpdatesForMemory(memory.id);

  assert.equal(afterSecond.status, "RETIRED");
  assert.equal(afterSecond.contradictedCount, 2);
  assert.equal(afterSecond.confirmedCount, before.confirmedCount);
  assertConfidenceEquals(afterSecond.confidence, before.confidence - 0.2, "confidence should decrease twice by 0.10");

  await getLatestMemoryUpdateOrThrow({
    memoryId: memory.id,
    updateType: "RETIRED",
  });

  assert.equal(secondResult.retired, 1);
  assert(secondResult.updatedMemoryIds.includes(memory.id));

  await printMemoryBehavior({
    title: "3. Retire memory: weaken same memory twice",
    before,
    after: afterSecond,
    updateRows: updates,
    result: {
      firstResult,
      secondResult,
    },
  });
}

async function testSupersedeMemory() {
  const oldMemory = await createWorkflowMemory({
    label: "supersede-old",
    kind: "HUMAN_CORRECTION",
    riskLevel: "MEDIUM",
    confidence: 0.75,
    entityType: "CLAIMANT",
    entityId: "CUST-W5-SMOKE-SUPERSEDE",
    fieldPath: "policyNumber",
    summary: "Old policyNumber correction memory for this claimant.",
    safeUse: "Ask reviewer to verify policyNumber.",
    tags: ["human_verified", "policy_number_correction", "old_memory"],
  });

  const newMemory = await createWorkflowMemory({
    label: "supersede-new",
    kind: "HUMAN_CORRECTION",
    riskLevel: "MEDIUM",
    confidence: 0.8,
    entityType: "CLAIMANT",
    entityId: "CUST-W5-SMOKE-SUPERSEDE",
    fieldPath: "policyNumber",
    summary: "Newer policyNumber correction memory for this claimant.",
    safeUse: "Ask reviewer to verify policyNumber using current documents.",
    tags: ["human_verified", "policy_number_correction", "new_memory"],
  });

  const before = await getMemoryOrThrow(oldMemory.id);

  const { decision } = await createRunWithReviewDecision({
    label: "supersede",
    decision: "EDIT_AND_APPROVE",
    extractedJson: {
      customerId: "CUST-W5-SMOKE-SUPERSEDE",
      claimNumber: "CLM-SUPERSEDE",
      policyNumber: "POL-OLDER-WRONG",
      lossType: "own_damage",
    },
    correctedJson: {
      customerId: "CUST-W5-SMOKE-SUPERSEDE",
      claimNumber: "CLM-SUPERSEDE",
      policyNumber: "POL-NEW-CORRECTED",
      lossType: "own_damage",
    },
  });

  const result = await updateMemoryFromReviewOutcome({
    reviewDecisionId: decision.id,
    createdMemoryIds: [newMemory.id],
  });

  const afterOld = await getMemoryOrThrow(oldMemory.id);
  const afterNew = await getMemoryOrThrow(newMemory.id);
  const updates = await getRecentUpdatesForMemory(oldMemory.id);

  assert.equal(afterOld.status, "SUPERSEDED");
  assert.equal(afterOld.supersededByMemoryId, newMemory.id);
  assert.equal(afterNew.status, "ACTIVE");

  await getLatestMemoryUpdateOrThrow({
    memoryId: oldMemory.id,
    updateType: "SUPERSEDED",
  });

  assert.equal(result.superseded, 1);
  assert(result.updatedMemoryIds.includes(oldMemory.id));

  await printMemoryBehavior({
    title:
      "4. Supersede memory: newer same kind/entity/field memory replaces old memory",
    before,
    after: afterOld,
    updateRows: updates,
    result: {
      ...result,
      newMemory: {
        id: afterNew.id,
        status: afterNew.status,
        confidence: afterNew.confidence,
      },
    },
  });
}

async function cleanup() {
  for (const documentId of createdDocumentIds) {
    await prisma.document
      .delete({
        where: {
          id: documentId,
        },
      })
      .catch(() => undefined);
  }

  for (const memoryId of createdMemoryIds) {
    await prisma.workflowMemory
      .delete({
        where: {
          id: memoryId,
        },
      })
      .catch(() => undefined);
  }
}

async function main() {
  console.log("Memory update smoke test started");
  console.log(`runLabel: ${RUN_LABEL}`);

  try {
    await testStrengthenMemory();
    await testWeakenMemory();
    await testRetireMemory();
    await testSupersedeMemory();

    console.log("\nMemory update smoke test passed");
    console.log(
      JSON.stringify(
        {
          strengthen: "STRENGTHENED + confirmedCount + confidence +0.05",
          weaken: "WEAKENED + contradictedCount + confidence -0.10",
          retire: "RETIRED after contradictedCount >= 2",
          supersede: "SUPERSEDED with supersededByMemoryId",
        },
        null,
        2,
      ),
    );
  } finally {
    await cleanup();
  }
}

if (import.meta.main) {
  main()
    .catch((error) => {
      console.error("\nMemory update smoke test failed");
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
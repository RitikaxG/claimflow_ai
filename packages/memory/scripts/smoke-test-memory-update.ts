// packages/memory/scripts/smoke-test-memory-update.ts

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

type MemoryUpdateTypeValue =
  | "CREATED"
  | "STRENGTHENED"
  | "WEAKENED"
  | "SUPERSEDED"
  | "RETIRED"
  | "FEEDBACK_RECORDED"
  | "GENERALIZED";

type AgentActionValue =
  | "RETRIEVE_POLICY_CLAUSES"
  | "CREATE_REVIEW_TASK"
  | "REQUEST_MISSING_DOCUMENT"
  | "MARK_NEEDS_MORE_EVIDENCE"
  | "MARK_NEEDS_MORE_INFO"
  | "DRAFT_FOLLOWUP_REQUEST"
  | "DRAFT_INFORMATION_REQUEST"
  | "DRAFT_APPROVAL_NOTE"
  | "DRAFT_DENIAL_REASON"
  | "ESCALATE_TO_HUMAN"
  | "ASK_CLARIFICATION"
  | "NO_ACTION";

type MatchSignal = {
  type: string;
  value: string;
  points: number;
};

type ScenarioPrintDetails = {
  title: string;
  currentClaim: Record<string, unknown>;
  memoryBeforeUse: {
    kind: string;
    riskLevel: string;
    summary: string;
    safeUse: string;
    mustNotDo: string[];
  };
  agentAction: {
    action: AgentActionValue | "NO_AGENT_ACTION_REQUIRED";
    rationale: string;
  };
  reviewerAction: {
    decision: ReviewDecisionValue;
    notes: string;
  };
  expectedLearning: string;
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

function stringifyList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
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
    extractedJson,
  };
}

async function createAgentActionLog(input: {
  runId: string;
  action: AgentActionValue;
  rationale: string;
  toolName: string;
  toolInputJson?: Record<string, unknown>;
}) {
  return prisma.agentActionLog.create({
    data: {
      runId: input.runId,
      action: input.action,
      status: "EXECUTED",
      rationale: input.rationale,
      guardrailDecision: "ALLOWED",
      toolName: input.toolName,
      toolInputJson: toPrismaJson(input.toolInputJson ?? {}),
      toolOutputJson: toPrismaJson({
        smokeTest: true,
        message: "Simulated agent action for memory update smoke test.",
      }),
    },
  });
}

async function createUsedMemoryHit(input: {
  memoryId: string;
  runId: string;
  score: number;
  matchedOn: MatchSignal[];
  agentAction: AgentActionValue;
  agentRationale: string;
  toolName?: string;
  retrievalReason?: string;
}) {
  const actionLog = await createAgentActionLog({
    runId: input.runId,
    action: input.agentAction,
    rationale: input.agentRationale,
    toolName: input.toolName ?? "escalate_to_human",
    toolInputJson: {
      runId: input.runId,
      reason: input.agentRationale,
      priority: "HIGH",
    },
  });

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
      agentActionLogId: actionLog.id,
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
  updateType?: MemoryUpdateTypeValue;
}) {
  const update = await prisma.memoryUpdate.findFirst({
    where: {
      memoryId: input.memoryId,
      ...(input.updateType ? { updateType: input.updateType } : {}),
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
  scenario: ScenarioPrintDetails;
  before: {
    id: string;
    status: string;
    confidence: number;
    confirmedCount: number;
    contradictedCount: number;
    supersededByMemoryId: string | null;
  };
  after: {
    id: string;
    status: string;
    confidence: number;
    confirmedCount: number;
    contradictedCount: number;
    supersededByMemoryId: string | null;
  };
}) {
  console.log(`\n${input.scenario.title}`);
  console.log("-".repeat(input.scenario.title.length));

  console.log("Scenario:");
  console.log(
    JSON.stringify(
      {
        currentClaim: input.scenario.currentClaim,
        memoryUsed: input.scenario.memoryBeforeUse,
        agentAction: input.scenario.agentAction,
        reviewerAction: input.scenario.reviewerAction,
        expectedLearning: input.scenario.expectedLearning,
      },
      null,
      2,
    ),
  );

  console.log("Memory changed:");
  console.log(
    JSON.stringify(
      {
        before: {
          memoryId: input.before.id,
          status: input.before.status,
          confidence: round2(input.before.confidence),
          confirmedCount: input.before.confirmedCount,
          contradictedCount: input.before.contradictedCount,
          supersededByMemoryId: input.before.supersededByMemoryId,
        },
        after: {
          memoryId: input.after.id,
          status: input.after.status,
          confidence: round2(input.after.confidence),
          confirmedCount: input.after.confirmedCount,
          contradictedCount: input.after.contradictedCount,
          supersededByMemoryId: input.after.supersededByMemoryId,
        },
      },
      null,
      2,
    ),
  );
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
    mustNotDo: [
      "do not overwrite extractedJson.policyNumber",
      "do not treat old policy number as current truth",
      "do not approve from memory",
    ],
    tags: ["human_verified", "policy_number_correction"],
  });

  const before = await getMemoryOrThrow(memory.id);

  const { run, decision, extractedJson } = await createRunWithReviewDecision({
    label: "strengthen",
    decision: "EDIT_AND_APPROVE",
    extractedJson: {
      customerId: "CUST-W5-SMOKE-STRENGTHEN",
      claimNumber: "CLM-STRENGTHEN",
      insuredName: "Anaya Shah",
      policyNumber: "POL-WRONG",
      lossType: "own_damage",
      damageType: "bumper_damage",
    },
    correctedJson: {
      customerId: "CUST-W5-SMOKE-STRENGTHEN",
      claimNumber: "CLM-STRENGTHEN",
      insuredName: "Anaya Shah",
      policyNumber: "POL-CORRECTED",
      lossType: "own_damage",
      damageType: "bumper_damage",
    },
    notes:
      "Reviewer found policyNumber was extracted incorrectly and corrected it.",
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
    agentAction: "ESCALATE_TO_HUMAN",
    agentRationale:
      "Relevant memory says policyNumber was previously corrected for this claimant. Route to reviewer to verify the current policyNumber.",
  });

  const result = await updateMemoryFromReviewOutcome({
    reviewDecisionId: decision.id,
  });

  const after = await getMemoryOrThrow(memory.id);

  assert.equal(after.status, "STRENGTHENED");
  assert.equal(after.confirmedCount, before.confirmedCount + 1);
  assert.equal(after.contradictedCount, before.contradictedCount);
  assertConfidenceEquals(
    after.confidence,
    before.confidence + 0.05,
    "confidence should increase by 0.05",
  );

  await getLatestMemoryUpdateOrThrow({
    memoryId: memory.id,
    updateType: "STRENGTHENED",
  });

  assert.equal(result.strengthened, 1);
  assert(result.updatedMemoryIds.includes(memory.id));

  await printMemoryBehavior({
    scenario: {
      title: "1. Strengthen memory: used MemoryHit + EDIT_AND_APPROVE same field",
      currentClaim: extractedJson,
      memoryBeforeUse: {
        kind: before.kind,
        riskLevel: before.riskLevel,
        summary: before.summary,
        safeUse: before.safeUse,
        mustNotDo: stringifyList(before.mustNotDo),
      },
      agentAction: {
        action: "ESCALATE_TO_HUMAN",
        rationale:
          "Agent used the prior policyNumber correction memory to route the claim to human review.",
      },
      reviewerAction: {
        decision: "EDIT_AND_APPROVE",
        notes:
          "Reviewer confirmed the same kind of issue by correcting policyNumber again.",
      },
      expectedLearning:
        "The memory was useful, so ClaimFlow strengthens it: confirmedCount +1 and confidence +0.05.",
    },
    before,
    after,
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
    mustNotDo: [
      "do not auto-reject future claims",
      "do not draft denial from memory",
      "do not treat prior rejection as policy evidence",
    ],
    tags: ["prior_rejection", "human_review"],
  });

  const before = await getMemoryOrThrow(memory.id);

  const { run, decision, extractedJson } = await createRunWithReviewDecision({
    label: "weaken",
    decision: "APPROVE_AS_IS",
    extractedJson: {
      customerId: "CUST-W5-SMOKE-WEAKEN",
      claimNumber: "CLM-WEAKEN",
      insuredName: "Kabir Mehta",
      policyNumber: "POL-WEAKEN",
      lossType: "own_damage",
      damageType: "minor_scratch",
    },
    notes:
      "Reviewer checked the claim and approved it as-is. Prior rejection memory was not relevant to this clean claim.",
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
    ],
    agentAction: "ESCALATE_TO_HUMAN",
    agentRationale:
      "Prior rejection memory exists for this claimant, so agent routed to human review instead of drafting approval.",
  });

  const result = await updateMemoryFromReviewOutcome({
    reviewDecisionId: decision.id,
  });

  const after = await getMemoryOrThrow(memory.id);

  assert.equal(after.status, "WEAKENED");
  assert.equal(after.confirmedCount, before.confirmedCount);
  assert.equal(after.contradictedCount, before.contradictedCount + 1);
  assertConfidenceEquals(
    after.confidence,
    before.confidence - 0.1,
    "confidence should decrease by 0.10",
  );

  await getLatestMemoryUpdateOrThrow({
    memoryId: memory.id,
    updateType: "WEAKENED",
  });

  assert.equal(result.weakened, 1);
  assert(result.updatedMemoryIds.includes(memory.id));

  await printMemoryBehavior({
    scenario: {
      title: "2. Weaken memory: used risk memory + APPROVE_AS_IS",
      currentClaim: extractedJson,
      memoryBeforeUse: {
        kind: before.kind,
        riskLevel: before.riskLevel,
        summary: before.summary,
        safeUse: before.safeUse,
        mustNotDo: stringifyList(before.mustNotDo),
      },
      agentAction: {
        action: "ESCALATE_TO_HUMAN",
        rationale:
          "Agent used prior rejection as a safe routing signal, not as denial evidence.",
      },
      reviewerAction: {
        decision: "APPROVE_AS_IS",
        notes:
          "Reviewer approved the claim as-is, meaning the prior rejection memory was less relevant than expected.",
      },
      expectedLearning:
        "The memory was contradicted by the reviewer outcome, so ClaimFlow weakens it: contradictedCount +1 and confidence -0.10.",
    },
    before,
    after,
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
    mustNotDo: [
      "do not auto-reject",
      "do not use prior rejection as policy evidence",
      "do not draft denial from memory",
    ],
    tags: ["prior_rejection", "human_review"],
  });

  const before = await getMemoryOrThrow(memory.id);

  const first = await createRunWithReviewDecision({
    label: "retire-first-contradiction",
    decision: "APPROVE_AS_IS",
    extractedJson: {
      customerId: "CUST-W5-SMOKE-RETIRE",
      claimNumber: "CLM-RETIRE-1",
      insuredName: "Meera Joshi",
      policyNumber: "POL-RETIRE-1",
      lossType: "own_damage",
      damageType: "minor_scratch",
    },
    notes:
      "First contradiction: reviewer approved despite prior rejection memory.",
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
    agentAction: "ESCALATE_TO_HUMAN",
    agentRationale:
      "Agent routed to human review because prior rejection memory existed for this claimant.",
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
      insuredName: "Meera Joshi",
      policyNumber: "POL-RETIRE-2",
      lossType: "own_damage",
      damageType: "minor_scratch",
    },
    notes:
      "Second contradiction: reviewer again approved despite prior rejection memory.",
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
    agentAction: "ESCALATE_TO_HUMAN",
    agentRationale:
      "Agent again routed to human review because the prior rejection memory was still retrievable.",
  });

  const secondResult = await updateMemoryFromReviewOutcome({
    reviewDecisionId: second.decision.id,
  });

  const afterSecond = await getMemoryOrThrow(memory.id);

  assert.equal(afterSecond.status, "RETIRED");
  assert.equal(afterSecond.contradictedCount, 2);
  assert.equal(afterSecond.confirmedCount, before.confirmedCount);
  assertConfidenceEquals(
    afterSecond.confidence,
    before.confidence - 0.2,
    "confidence should decrease twice by 0.10",
  );

  await getLatestMemoryUpdateOrThrow({
    memoryId: memory.id,
    updateType: "RETIRED",
  });

  assert.equal(secondResult.retired, 1);
  assert(secondResult.updatedMemoryIds.includes(memory.id));

  await printMemoryBehavior({
    scenario: {
      title: "3. Retire memory: weaken same memory twice",
      currentClaim: {
        firstClaim: first.extractedJson,
        secondClaim: second.extractedJson,
      },
      memoryBeforeUse: {
        kind: before.kind,
        riskLevel: before.riskLevel,
        summary: before.summary,
        safeUse: before.safeUse,
        mustNotDo: stringifyList(before.mustNotDo),
      },
      agentAction: {
        action: "ESCALATE_TO_HUMAN",
        rationale:
          "Agent used the same prior rejection memory in two future claims and routed both to review.",
      },
      reviewerAction: {
        decision: "APPROVE_AS_IS",
        notes:
          "Reviewer contradicted the memory twice by approving both future claims as-is.",
      },
      expectedLearning:
        "After two contradictions, ClaimFlow retires the memory so it is no longer retrieved.",
    },
    before,
    after: afterSecond,
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
    mustNotDo: [
      "do not overwrite policyNumber",
      "do not use old correction as current truth",
      "do not approve from memory",
    ],
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
    mustNotDo: [
      "do not overwrite policyNumber",
      "do not use memory as source of truth",
      "do not approve from memory",
    ],
    tags: ["human_verified", "policy_number_correction", "new_memory"],
  });

  const before = await getMemoryOrThrow(oldMemory.id);

  const { decision, extractedJson } = await createRunWithReviewDecision({
    label: "supersede",
    decision: "EDIT_AND_APPROVE",
    extractedJson: {
      customerId: "CUST-W5-SMOKE-SUPERSEDE",
      claimNumber: "CLM-SUPERSEDE",
      insuredName: "Ishaan Rao",
      policyNumber: "POL-OLDER-WRONG",
      lossType: "own_damage",
      damageType: "bumper_damage",
    },
    correctedJson: {
      customerId: "CUST-W5-SMOKE-SUPERSEDE",
      claimNumber: "CLM-SUPERSEDE",
      insuredName: "Ishaan Rao",
      policyNumber: "POL-NEW-CORRECTED",
      lossType: "own_damage",
      damageType: "bumper_damage",
    },
    notes:
      "Reviewer created a newer correction for the same claimant and same field.",
  });

  const result = await updateMemoryFromReviewOutcome({
    reviewDecisionId: decision.id,
    createdMemoryIds: [newMemory.id],
  });

  const afterOld = await getMemoryOrThrow(oldMemory.id);
  const afterNew = await getMemoryOrThrow(newMemory.id);

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
    scenario: {
      title:
        "4. Supersede memory: newer same kind/entity/field memory replaces old memory",
      currentClaim: extractedJson,
      memoryBeforeUse: {
        kind: before.kind,
        riskLevel: before.riskLevel,
        summary: before.summary,
        safeUse: before.safeUse,
        mustNotDo: stringifyList(before.mustNotDo),
      },
      agentAction: {
        action: "NO_AGENT_ACTION_REQUIRED",
        rationale:
          "Supersession happens because a newer review correction produced a newer memory for the same kind/entity/field scope.",
      },
      reviewerAction: {
        decision: "EDIT_AND_APPROVE",
        notes:
          "Reviewer corrected policyNumber again. The newer memory should replace the older same-scope memory.",
      },
      expectedLearning:
        "ClaimFlow marks the older memory SUPERSEDED and points supersededByMemoryId to the newer memory.",
    },
    before,
    after: afterOld,
  });
}

async function testGenericRequiredEvidenceAcrossDifferentEntity() {
  const memory = await createWorkflowMemory({
    label: "generic-required-evidence-different-entity",
    kind: "PRIOR_REVIEW_DECISION",
    riskLevel: "MEDIUM",
    confidence: 0.72,

    // Important:
    // This is not scoped to CLAIMANT or VENDOR.
    // It is scoped to the reusable workflow problem.
    entityType: "FIELD_PATH",
    entityId: "requiredEvidence.policeReport",
    fieldPath: "requiredEvidence.policeReport",

    summary:
      "Prior review required policeReport evidence before continuing similar third-party claims.",
    safeUse:
      "When current validation says policeReport is required, draft/request specific missing evidence. Do not assume it is missing without current validation.",
    mustNotDo: [
      "do not apply this only because claimant name is similar",
      "do not reject the claim from memory",
      "do not mark policeReport missing unless current validation requires it",
    ],
    tags: [
      "required_evidence:police_report",
      "police_report_required",
      "third_party_claim",
      "review_decision",
    ],
  });

  const before = await getMemoryOrThrow(memory.id);

  const { run, decision, extractedJson } = await createRunWithReviewDecision({
    label: "generic-required-evidence-different-entity",
    decision: "REQUEST_MORE_INFO",
    extractedJson: {
      customerId: "CUST-W5-DIFFERENT-CLAIMANT",
      vendorId: "VEND-W5-DIFFERENT-VENDOR",
      claimNumber: "CLM-GENERIC-EVIDENCE",
      insuredName: "Rohan Verma",
      policyNumber: "POL-GENERIC-EVIDENCE",
      lossType: "third_party",
      damageType: "bumper_damage",
    },
    correctedJson: null,
    correctedValidationJson: null,
    notes:
      "Reviewer requested policeReport because current claim validation required it. Claimant/vendor are different from any prior entity.",
  });

  await createUsedMemoryHit({
    memoryId: memory.id,
    runId: run.id,
    score: 60,
    matchedOn: [
      {
        type: "SAME_FIELD",
        value: "requiredEvidence.policeReport",
        points: 30,
      },
      {
        type: "REQUIRED_EVIDENCE_MATCH",
        value: "required_evidence:police_report",
        points: 30,
      },
    ],
    agentAction: "DRAFT_INFORMATION_REQUEST",
    toolName: "draft_information_request",
    agentRationale:
      "A generic FIELD_PATH memory matched the current requiredEvidence.policeReport issue. This is not tied to the same claimant or vendor, so it is safe to use as a workflow pattern.",
  });

  const result = await updateMemoryFromReviewOutcome({
    reviewDecisionId: decision.id,
  });

  const after = await getMemoryOrThrow(memory.id);

  assert.equal(after.status, "STRENGTHENED");
  assert.equal(after.confirmedCount, before.confirmedCount + 1);
  assert.equal(after.contradictedCount, before.contradictedCount);
  assertConfidenceEquals(
    after.confidence,
    before.confidence + 0.05,
    "generic required evidence memory confidence should increase by 0.05",
  );

  await getLatestMemoryUpdateOrThrow({
    memoryId: memory.id,
    updateType: "STRENGTHENED",
  });

  assert.equal(result.strengthened, 1);
  assert(result.updatedMemoryIds.includes(memory.id));

  await printMemoryBehavior({
    scenario: {
      title:
        "5. Generic required-evidence memory: same missing evidence, different claimant/vendor",
      currentClaim: {
        ...extractedJson,
        currentRequiredEvidence: ["policeReport"],
        importantPoint:
          "This claimant/vendor is different. Memory applies only because it is FIELD_PATH-scoped, not entity-scoped.",
      },
      memoryBeforeUse: {
        kind: before.kind,
        riskLevel: before.riskLevel,
        summary: before.summary,
        safeUse: before.safeUse,
        mustNotDo: stringifyList(before.mustNotDo),
      },
      agentAction: {
        action: "DRAFT_INFORMATION_REQUEST",
        rationale:
          "Agent used a generic requiredEvidence.policeReport memory to draft/request missing evidence for a different claimant/vendor.",
      },
      reviewerAction: {
        decision: "REQUEST_MORE_INFO",
        notes:
          "Reviewer also requested policeReport, confirming the generic workflow memory was useful.",
      },
      expectedLearning:
        "Because this is a FIELD_PATH-scoped workflow memory, it can generalize across claimants/vendors. Reviewer confirmed it, so ClaimFlow strengthens the memory.",
    },
    before,
    after,
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
    await testGenericRequiredEvidenceAcrossDifferentEntity();

    console.log("\nMemory update smoke test passed");
    console.log(
      JSON.stringify(
        {
          strengthen:
            "Reviewer confirmed field memory relevance: STRENGTHENED + confirmedCount + confidence +0.05",
          weaken:
            "Reviewer contradicted risk memory: WEAKENED + contradictedCount + confidence -0.10",
          retire:
            "Reviewer contradicted same memory twice: RETIRED after contradictedCount >= 2",
          supersede:
            "Newer same-scope correction exists: old memory SUPERSEDED with supersededByMemoryId",
          genericRequiredEvidence:
            "Same required-evidence problem across different claimant/vendor: FIELD_PATH memory is STRENGTHENED",
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
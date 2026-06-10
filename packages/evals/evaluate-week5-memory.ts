import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyMemoryConfidenceUpdate,
  createMemoryFromObservation,
  loadWeek5MemorySeed,
  maybeCreatePatternMemory,
  retrieveRelevantMemories,
  type MemoryObservation,
  type RelevantMemory,
} from "@repo/memory";
import { prisma, Prisma } from "@repo/db";
import { evaluateAgentAction } from "@repo/agent";
import {
  ClaimStateForAgentSchema,
  type AgentActionType,
  type ClaimStateForAgent,
  type ProposedAgentAction,
} from "@repo/shared/schemas";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATASET_ROOT = process.env.WEEK5_MEMORY_DATASET_ROOT
  ? path.resolve(process.env.WEEK5_MEMORY_DATASET_ROOT)
  : path.resolve(__dirname, "../../sample-data/week-05-memory");

const PACKETS_ROOT = path.join(DATASET_ROOT, "packets");
const REPORT_ROOT = path.join(DATASET_ROOT, "eval-results");

const JSON_REPORT_PATH = path.join(REPORT_ROOT, "week-5-memory-eval.json");
const MARKDOWN_REPORT_PATH = path.join(REPORT_ROOT, "week-5-memory-eval.md");

const REPORT_SCHEMA_VERSION = 1;

type Week5EvalCategory =
  | "memory_writer"
  | "memory_retrieval"
  | "memory_safety"
  | "memory_conflict"
  | "memory_update"
  | "semantic_pattern";

type PacketManifest = {
  packetId: string;
  category: Week5EvalCategory;
  title: string;
  purpose: string;
};

type ExpectedMemoryHits = {
  packetId: string;
  expectedHitMemorySeedIds: string[];
  expectedIgnoredMemorySeedIds: string[];
  allowedExtraMemorySeedIds?: string[];
  expectedUse: string;
  mustNotUseFor: string[];
};

type WriterExpected = {
  packetId: string;
  expectedCreated: boolean;
  expectedKind: string;
  expectedRiskLevel?: string;
  expectedEntityType?: string | null;
  expectedEntityId?: string | null;
  expectedFieldPath?: string | null;
  requiredSummaryIncludes?: string[];
  requiredSafeUseIncludes?: string[];
  requiredMustNotDo?: string[];
  requiredTags?: string[];
};

type SafetyExpected = {
  packetId: string;
  memorySeedIds: string[];
  expectedAllowedAction: ProposedAgentAction;
  blockedProbes: Array<{
    label: string;
    proposedAction: ProposedAgentAction;
    expectedRuleIds: string[];
    countsAsUnsafeOverwrite?: boolean;
    countsAsFalseApproval?: boolean;
    countsAsSourceOfTruthViolation?: boolean;
  }>;
};

type UpdateExpected = {
  packetId: string;
  initialMemory: {
    kind: string;
    status: string;
    riskLevel: string;
    confidence: number;
    entityType: string | null;
    entityId: string | null;
    fieldPath: string | null;
    confirmedCount: number;
    contradictedCount: number;
  };
  updateType: "STRENGTHENED" | "WEAKENED" | "RETIRED" | "SUPERSEDED";
  expectedUpdate: {
    status: string;
    confidenceDelta: number;
    confirmedCountDelta: number;
    contradictedCountDelta: number;
    memoryUpdateType: string;
  };
};

type PatternExpected = {
  packetId: string;
  sourceMemorySetup: {
    kind: string;
    fieldPath: string;
    count: number;
  };
  expectedPattern: {
    kind: string;
    entityType: string;
    entityId: string;
    fieldPath: string;
    requiredTags: string[];
    requiredMustNotDo: string[];
  };
};

type Week5CaseResult = {
  packetId: string;
  category: Week5EvalCategory;
  title: string;

  expected: Record<string, unknown>;
  actual: Record<string, unknown>;

  memoryWritePassed: boolean | null;
  retrievalPassed: boolean | null;
  topKHitPassed: boolean | null;
  hitLoggingPassed: boolean | null;
  safetyPassed: boolean | null;
  conflictPassed: boolean | null;
  updatePassed: boolean | null;
  patternPassed: boolean | null;

  unsafeMemoryOverwrite: boolean;
  falseApproval: boolean;
  sourceOfTruthViolation: boolean;

  passed: boolean;
  error: string | null;
};

type Week5MemoryEvalReport = {
  schemaVersion: number;
  generatedAt: string;
  datasetRoot: string;
  summary: {
    totalPackets: number;
    passed: number;
    failed: number;

    memory_write_accuracy: number | null;
    memory_recall_rate: number | null;
    memory_precision_rate: number | null;
    memory_top_k_hit_rate: number | null;
    memory_hit_logging_rate: number | null;
    memory_supported_review_rate: number | null;
    memory_update_accuracy: number | null;
    semantic_pattern_creation_accuracy: number | null;

    unsafe_memory_overwrite_rate: number;
    false_approval_rate: number;
    source_of_truth_violation_rate: number;
  };
  cases: Week5CaseResult[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf-8")) as T;
}

async function readOptionalJson<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

async function writeJson(filePath: string, value: unknown) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function rate(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

function formatPercent(value: number | null): string {
  return value === null ? "skipped" : `${(value * 100).toFixed(1)}%`;
}

function includesAllText(haystack: string, needles: string[] = []): boolean {
  const normalized = haystack.toLowerCase();

  return needles.every((needle) => normalized.includes(needle.toLowerCase()));
}

function arrayIncludesAll(actual: string[], expected: string[] = []): boolean {
  return expected.every((item) => actual.includes(item));
}

function getMemorySeedId(evidenceJson: unknown): string | null {
  if (!isRecord(evidenceJson)) return null;
  const value = evidenceJson.memorySeedId;
  return typeof value === "string" ? value : null;
}

function getPatternKey(evidenceJson: unknown): string | null {
  if (!isRecord(evidenceJson)) return null;
  const value = evidenceJson.patternKey;
  return typeof value === "string" ? value : null;
}

async function getSeedIdByMemoryId(memoryIds: string[]): Promise<Map<string, string>> {
  if (memoryIds.length === 0) return new Map();

  const rows = await prisma.workflowMemory.findMany({
    where: {
      id: {
        in: memoryIds,
      },
    },
    select: {
      id: true,
      evidenceJson: true,
    },
  });

  return new Map(
    rows.map((row) => [row.id, getMemorySeedId(row.evidenceJson) ?? "UNKNOWN_SEED"]),
  );
}

async function getRetrievedSeedIds(memories: RelevantMemory[]): Promise<string[]> {
  const seedIdByMemoryId = await getSeedIdByMemoryId(
    memories.map((memory) => memory.memoryId),
  );

  return memories.map((memory) => seedIdByMemoryId.get(memory.memoryId) ?? "UNKNOWN_SEED");
}

function buildPassedResult(input: {
  packetId: string;
  category: Week5EvalCategory;
  title: string;
  expected: Record<string, unknown>;
  actual: Record<string, unknown>;
  memoryWritePassed?: boolean | null;
  retrievalPassed?: boolean | null;
  topKHitPassed?: boolean | null;
  hitLoggingPassed?: boolean | null;
  safetyPassed?: boolean | null;
  conflictPassed?: boolean | null;
  updatePassed?: boolean | null;
  patternPassed?: boolean | null;
  unsafeMemoryOverwrite?: boolean;
  falseApproval?: boolean;
  sourceOfTruthViolation?: boolean;
  error?: string | null;
}): Week5CaseResult {
  const result: Week5CaseResult = {
    packetId: input.packetId,
    category: input.category,
    title: input.title,

    expected: input.expected,
    actual: input.actual,

    memoryWritePassed: input.memoryWritePassed ?? null,
    retrievalPassed: input.retrievalPassed ?? null,
    topKHitPassed: input.topKHitPassed ?? null,
    hitLoggingPassed: input.hitLoggingPassed ?? null,
    safetyPassed: input.safetyPassed ?? null,
    conflictPassed: input.conflictPassed ?? null,
    updatePassed: input.updatePassed ?? null,
    patternPassed: input.patternPassed ?? null,

    unsafeMemoryOverwrite: input.unsafeMemoryOverwrite ?? false,
    falseApproval: input.falseApproval ?? false,
    sourceOfTruthViolation: input.sourceOfTruthViolation ?? false,

    passed: false,
    error: input.error ?? null,
  };

  const checks = [
    result.memoryWritePassed,
    result.retrievalPassed,
    result.topKHitPassed,
    result.hitLoggingPassed,
    result.safetyPassed,
    result.conflictPassed,
    result.updatePassed,
    result.patternPassed,
  ].filter((value): value is boolean => value !== null);

  result.passed =
    checks.length > 0 &&
    checks.every(Boolean) &&
    !result.unsafeMemoryOverwrite &&
    !result.falseApproval &&
    !result.sourceOfTruthViolation &&
    result.error === null;

  return result;
}

function buildErrorResult(input: {
  packetId: string;
  category: Week5EvalCategory;
  title: string;
  error: unknown;
}): Week5CaseResult {
  return {
    packetId: input.packetId,
    category: input.category,
    title: input.title,
    expected: {},
    actual: {},
    memoryWritePassed: null,
    retrievalPassed: null,
    topKHitPassed: null,
    hitLoggingPassed: null,
    safetyPassed: null,
    conflictPassed: null,
    updatePassed: null,
    patternPassed: null,
    unsafeMemoryOverwrite: false,
    falseApproval: false,
    sourceOfTruthViolation: false,
    passed: false,
    error: getErrorMessage(input.error),
  };
}

async function evaluateWriterPacket(
  packetRoot: string,
  manifest: PacketManifest,
): Promise<Week5CaseResult> {
  const observation = await readJson<MemoryObservation>(
    path.join(packetRoot, "observation.json"),
  );
  const expected = await readJson<WriterExpected>(
    path.join(packetRoot, "gold", "writer.expected.json"),
  );

  await prisma.workflowMemory.deleteMany({
    where: {
      summary: observation.summary,
    },
  });

  const result = await createMemoryFromObservation(observation);

  const memory = result.memoryId
    ? await prisma.workflowMemory.findUnique({
        where: {
          id: result.memoryId,
        },
      })
    : null;

  const actualTags = getStringArray(memory?.tags);
  const actualMustNotDo = getStringArray(memory?.mustNotDo);

  const createdPassed = expected.expectedCreated
    ? Boolean(memory && !result.skipped)
    : result.skipped;

  const shapePassed =
    Boolean(memory) &&
    memory?.kind === expected.expectedKind &&
    (expected.expectedRiskLevel ? memory?.riskLevel === expected.expectedRiskLevel : true) &&
    (expected.expectedEntityType !== undefined
      ? memory?.entityType === expected.expectedEntityType
      : true) &&
    (expected.expectedEntityId !== undefined
      ? memory?.entityId === expected.expectedEntityId
      : true) &&
    (expected.expectedFieldPath !== undefined
      ? memory?.fieldPath === expected.expectedFieldPath
      : true);

  const safetyFieldsPassed =
    Boolean(memory) &&
    includesAllText(memory?.summary ?? "", expected.requiredSummaryIncludes) &&
    includesAllText(memory?.safeUse ?? "", expected.requiredSafeUseIncludes) &&
    arrayIncludesAll(actualMustNotDo, expected.requiredMustNotDo) &&
    arrayIncludesAll(actualTags, expected.requiredTags);

  const updateLogged = result.memoryId
    ? (await prisma.memoryUpdate.count({
        where: {
          memoryId: result.memoryId,
          updateType: "CREATED",
        },
      })) > 0
    : false;

  if (result.memoryId) {
    await prisma.workflowMemory
      .delete({
        where: {
          id: result.memoryId,
        },
      })
      .catch(() => undefined);
  }

  return buildPassedResult({
    packetId: manifest.packetId,
    category: manifest.category,
    title: manifest.title,
    expected: expected as unknown as Record<string, unknown>,
    actual: {
      memoryId: result.memoryId,
      skipped: result.skipped,
      reason: result.reason,
      kind: memory?.kind ?? null,
      riskLevel: memory?.riskLevel ?? null,
      entityType: memory?.entityType ?? null,
      entityId: memory?.entityId ?? null,
      fieldPath: memory?.fieldPath ?? null,
      tags: actualTags,
      mustNotDo: actualMustNotDo,
      updateLogged,
    },
    memoryWritePassed: createdPassed && shapePassed && safetyFieldsPassed && updateLogged,
  });
}

async function maybeRunHitLoggingAudit(input: {
  packetId: string;
  claimState: unknown;
  expectedHitMemorySeedIds: string[];
}): Promise<{
  passed: boolean;
  actual: Record<string, unknown>;
}> {
  let documentId: string | null = null;

  try {
    const claimState = isRecord(input.claimState) ? input.claimState : {};
    const extractedJson = claimState.extractedJson ?? {};
    const validationJson = claimState.validationJson ?? {};
    const missingFields = getStringArray(claimState.missingFields);
    const runStatus =
      typeof claimState.runStatus === "string" ? claimState.runStatus : "NEEDS_REVIEW";

    const document = await prisma.document.create({
      data: {
        filename: `${input.packetId}-hit-logging-eval.json`,
        mimeType: "application/json",
        sizeBytes: 1,
        sourceType: "EMAIL_TEXT",
        contentText: `Week 5 memory hit logging eval for ${input.packetId}`,
      },
    });

    documentId = document.id;

    const run = await prisma.extractionRun.create({
      data: {
        documentId: document.id,
        status: runStatus as never,
        extractedJson: toPrismaJson(extractedJson),
        validationJson: toPrismaJson(validationJson),
        missingFieldsJson: toPrismaJson(missingFields),
      },
    });

    const result = await retrieveRelevantMemories({
      runId: run.id,
      writeHits: true,
      limit: 5,
    });

    const hitCount = await prisma.memoryHit.count({
      where: {
        runId: run.id,
      },
    });

    const retrievedSeedIds = await getRetrievedSeedIds(result.memories);

    const expectedHitLogged = input.expectedHitMemorySeedIds.every((seedId) =>
      retrievedSeedIds.includes(seedId),
    );

    return {
      passed: hitCount > 0 && expectedHitLogged,
      actual: {
        runId: run.id,
        hitCount,
        writtenHitCount: result.writtenHitCount,
        retrievedSeedIds,
      },
    };
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

async function evaluateRetrievalPacket(
  packetRoot: string,
  manifest: PacketManifest,
): Promise<Week5CaseResult> {
  const claimState = await readJson<unknown>(path.join(packetRoot, "new-claim-state.json"));
  const expected = await readJson<ExpectedMemoryHits>(
    path.join(packetRoot, "expected-memory-hits.json"),
  );
  const retrievalGold = await readOptionalJson<{ expectHitLogging?: boolean }>(
    path.join(packetRoot, "gold", "retrieval.expected.json"),
  );

  const result = await retrieveRelevantMemories({
    claimState,
    writeHits: false,
    limit: 5,
  });

  const retrievedSeedIds = await getRetrievedSeedIds(result.memories);
  const allowedExtra = expected.allowedExtraMemorySeedIds ?? [];

  const expectedHitsPresent = expected.expectedHitMemorySeedIds.every((seedId) =>
    retrievedSeedIds.includes(seedId),
  );

  const ignoredAbsent = expected.expectedIgnoredMemorySeedIds.every(
    (seedId) => !retrievedSeedIds.includes(seedId),
  );

  const unexpectedRetrievedSeedIds = retrievedSeedIds.filter((seedId) => {
    if (seedId === "UNKNOWN_SEED") return false;
    return (
      !expected.expectedHitMemorySeedIds.includes(seedId) &&
      !allowedExtra.includes(seedId)
    );
  });

  const retrievalPassed = expectedHitsPresent && ignoredAbsent;
  const topKHitPassed =
    expected.expectedHitMemorySeedIds.length === 0
      ? result.memories.length === 0
      : expected.expectedHitMemorySeedIds.every((seedId) =>
          retrievedSeedIds.slice(0, 5).includes(seedId),
        );

  const precisionPassed = unexpectedRetrievedSeedIds.length === 0;

  const hitLogging = retrievalGold?.expectHitLogging
    ? await maybeRunHitLoggingAudit({
        packetId: manifest.packetId,
        claimState,
        expectedHitMemorySeedIds: expected.expectedHitMemorySeedIds,
      })
    : null;

  return buildPassedResult({
    packetId: manifest.packetId,
    category: manifest.category,
    title: manifest.title,
    expected: expected as unknown as Record<string, unknown>,
    actual: {
      totalCandidates: result.totalCandidates,
      writtenHitCount: result.writtenHitCount,
      retrievedSeedIds,
      unexpectedRetrievedSeedIds,
      allowedExtraMemorySeedIds: allowedExtra,
      precisionPassed,
      hitLogging: hitLogging?.actual ?? null,
    },
    retrievalPassed: retrievalPassed && precisionPassed,
    topKHitPassed,
    hitLoggingPassed: hitLogging ? hitLogging.passed : null,
  });
}

async function loadAgentMemoryFromSeedId(seedId: string) {
  const memory = await prisma.workflowMemory.findFirst({
    where: {
      evidenceJson: {
        path: ["memorySeedId"],
        equals: seedId,
      } as never,
    },
  });

  if (!memory) {
    throw new Error(`Seed memory not found in DB: ${seedId}`);
  }

  return {
    memoryId: memory.id,
    memoryHitId: null,
    kind: memory.kind,
    status: memory.status,
    riskLevel: memory.riskLevel,
    confidence: memory.confidence,
    score:
      memory.kind === "HUMAN_CORRECTION"
        ? 60
        : memory.riskLevel === "HIGH"
          ? 45
          : 35,
    summary: memory.summary,
    safeUse: memory.safeUse,
    mustNotDo: getStringArray(memory.mustNotDo),
    entityType: memory.entityType,
    entityId: memory.entityId,
    fieldPath: memory.fieldPath,
    matchedOn:
      memory.kind === "HUMAN_CORRECTION"
        ? [{ type: "SAME_FIELD", value: memory.fieldPath ?? "unknown", points: 30 }]
        : [{ type: "EXACT_CLAIMANT", value: memory.entityId ?? "unknown", points: 20 }],
    retrievalReason: `Injected from eval seed ${seedId}.`,
  };
}

async function buildClaimStateForSafetyEval(input: {
  packetRoot: string;
  expected: SafetyExpected;
}): Promise<ClaimStateForAgent> {
  const rawClaimState = await readJson<unknown>(
    path.join(input.packetRoot, "claim-state-for-agent.json"),
  );

  const parsed = ClaimStateForAgentSchema.parse(rawClaimState);
  const memories = [];

  for (const seedId of input.expected.memorySeedIds) {
    memories.push(await loadAgentMemoryFromSeedId(seedId));
  }

  return ClaimStateForAgentSchema.parse({
    ...parsed,
    relevantMemories: memories,
    workflowMemoryContext:
      memories.length > 0
        ? memories.map((memory) => memory.summary).join("\n")
        : parsed.workflowMemoryContext,
  });
}

function actionToToolName(action: AgentActionType): string {
  return action.toLowerCase();
}

function ensureToolName(action: ProposedAgentAction): ProposedAgentAction {
  return {
    ...action,
    toolName: action.toolName ?? actionToToolName(action.action),
  };
}

async function evaluateSafetyLikePacket(
  packetRoot: string,
  manifest: PacketManifest,
): Promise<Week5CaseResult> {
  const expected = await readJson<SafetyExpected>(
    path.join(packetRoot, "gold", "safety.expected.json"),
  );

  const context = await buildClaimStateForSafetyEval({
    packetRoot,
    expected,
  });

  const allowedProbe = ensureToolName(expected.expectedAllowedAction);
  const allowedDecision = evaluateAgentAction({
    context,
    proposedAction: allowedProbe,
  });

  const blockedResults = expected.blockedProbes.map((probe) => {
    const guardrail = evaluateAgentAction({
      context,
      proposedAction: ensureToolName(probe.proposedAction),
    });

    const passed =
      guardrail.decision === "BLOCKED" &&
      probe.expectedRuleIds.includes(guardrail.ruleId);

    return {
      label: probe.label,
      passed,
      actualDecision: guardrail.decision,
      actualRuleId: guardrail.ruleId,
      expectedRuleIds: probe.expectedRuleIds,
      countsAsUnsafeOverwrite: probe.countsAsUnsafeOverwrite === true,
      countsAsFalseApproval: probe.countsAsFalseApproval === true,
      countsAsSourceOfTruthViolation: probe.countsAsSourceOfTruthViolation === true,
    };
  });

  const allowedPassed = allowedDecision.decision === "ALLOWED";
  const blockedPassed = blockedResults.every((item) => item.passed);

  const unsafeMemoryOverwrite = blockedResults.some(
    (item) => item.countsAsUnsafeOverwrite && !item.passed,
  );

  const falseApproval = blockedResults.some(
    (item) => item.countsAsFalseApproval && !item.passed,
  );

  const sourceOfTruthViolation = blockedResults.some(
    (item) => item.countsAsSourceOfTruthViolation && !item.passed,
  );

  const safetyPassed = allowedPassed && blockedPassed;

  return buildPassedResult({
    packetId: manifest.packetId,
    category: manifest.category,
    title: manifest.title,
    expected: expected as unknown as Record<string, unknown>,
    actual: {
      injectedMemorySeedIds: expected.memorySeedIds,
      allowedProbe: {
        action: allowedProbe.action,
        decision: allowedDecision.decision,
        ruleId: allowedDecision.ruleId,
      },
      blockedResults,
    },
    safetyPassed: manifest.category === "memory_safety" ? safetyPassed : null,
    conflictPassed: manifest.category === "memory_conflict" ? safetyPassed : null,
    unsafeMemoryOverwrite,
    falseApproval,
    sourceOfTruthViolation,
  });
}

async function evaluateUpdatePacket(
  packetRoot: string,
  manifest: PacketManifest,
): Promise<Week5CaseResult> {
  const expected = await readJson<UpdateExpected>(
    path.join(packetRoot, "gold", "update.expected.json"),
  );

  let memoryId: string | null = null;

  try {
    const memory = await prisma.workflowMemory.create({
      data: {
        kind: expected.initialMemory.kind as never,
        status: expected.initialMemory.status as never,
        riskLevel: expected.initialMemory.riskLevel as never,
        confidence: expected.initialMemory.confidence,
        summary: `Week 5 eval temp memory for ${manifest.packetId}`,
        safeUse: "Eval temp safe use: route to review only.",
        mustNotDo: toPrismaJson([
          "do not approve from memory",
          "do not reject from memory",
          "do not overwrite current evidence",
        ]),
        entityType: expected.initialMemory.entityType,
        entityId: expected.initialMemory.entityId,
        fieldPath: expected.initialMemory.fieldPath,
        tags: toPrismaJson(["week5_eval_temp"]),
        evidenceJson: toPrismaJson({
          week5EvalTemp: true,
          packetId: manifest.packetId,
        }),
        confirmedCount: expected.initialMemory.confirmedCount,
        contradictedCount: expected.initialMemory.contradictedCount,
      },
    });

    memoryId = memory.id;

    const updateResult = await applyMemoryConfidenceUpdate({
      memoryId,
      updateType: expected.updateType,
      note: `Week 5 eval update for ${manifest.packetId}`,
      metadata: {
        packetId: manifest.packetId,
      },
    });

    const updatedMemory = await prisma.workflowMemory.findUniqueOrThrow({
      where: {
        id: memoryId,
      },
    });

    const confirmedDelta =
      updatedMemory.confirmedCount - expected.initialMemory.confirmedCount;
    const contradictedDelta =
      updatedMemory.contradictedCount - expected.initialMemory.contradictedCount;
    const confidenceDelta = Number(
      (updatedMemory.confidence - expected.initialMemory.confidence).toFixed(4),
    );

    const updateLogged = await prisma.memoryUpdate.findFirst({
      where: {
        memoryId,
        updateType: expected.expectedUpdate.memoryUpdateType as never,
      },
    });

    const updatePassed =
      updatedMemory.status === expected.expectedUpdate.status &&
      confirmedDelta === expected.expectedUpdate.confirmedCountDelta &&
      contradictedDelta === expected.expectedUpdate.contradictedCountDelta &&
      confidenceDelta === expected.expectedUpdate.confidenceDelta &&
      Boolean(updateLogged);

    return buildPassedResult({
      packetId: manifest.packetId,
      category: manifest.category,
      title: manifest.title,
      expected: expected as unknown as Record<string, unknown>,
      actual: {
        memoryId,
        updateResult,
        afterStatus: updatedMemory.status,
        afterConfidence: updatedMemory.confidence,
        confidenceDelta,
        confirmedDelta,
        contradictedDelta,
        updateLogged: Boolean(updateLogged),
      },
      updatePassed,
    });
  } finally {
    if (memoryId) {
      await prisma.workflowMemory
        .delete({
          where: {
            id: memoryId,
          },
        })
        .catch(() => undefined);
    }
  }
}

async function evaluatePatternPacket(
  packetRoot: string,
  manifest: PacketManifest,
): Promise<Week5CaseResult> {
  const expected = await readJson<PatternExpected>(
    path.join(packetRoot, "gold", "pattern.expected.json"),
  );

  const sourceMemoryIds: string[] = [];
  let patternMemoryId: string | null = null;

  try {
    for (let index = 0; index < expected.sourceMemorySetup.count; index += 1) {
      const memory = await prisma.workflowMemory.create({
        data: {
          kind: expected.sourceMemorySetup.kind as never,
          status: "ACTIVE",
          riskLevel: "MEDIUM",
          confidence: 0.72,
          summary: `Week 5 eval temp correction ${index + 1} for ${manifest.packetId}`,
          safeUse:
            "When this field is missing or low-confidence, ask reviewer to verify it.",
          mustNotDo: toPrismaJson([
            `auto-correct ${expected.sourceMemorySetup.fieldPath} from memory`,
            "overwrite extractedJson",
            "treat old corrected values as current truth",
            "approve or reject the claim from this pattern",
          ]),
          entityType: "CLAIMANT",
          entityId: `CUST-W5-EVAL-${index + 1}`,
          fieldPath: expected.sourceMemorySetup.fieldPath,
          tags: toPrismaJson([
            "human_verified",
            "field_correction",
            `${expected.sourceMemorySetup.fieldPath}_missing`,
            `missing_field:${expected.sourceMemorySetup.fieldPath}`,
            "week5_eval_temp",
          ]),
          evidenceJson: toPrismaJson({
            week5EvalTemp: true,
            sourceObservationIds: [`OBS-W5-EVAL-${index + 1}`],
            sourcePacketIds: [manifest.packetId],
            sourceWeeks: [5],
          }),
          confirmedCount: 0,
          contradictedCount: 0,
        },
      });

      sourceMemoryIds.push(memory.id);
    }

    const result = await maybeCreatePatternMemory({
      sourceMemoryIds,
      minFieldCorrectionCount: expected.sourceMemorySetup.count,
      minVendorRiskCount: 2,
      minClaimantPatternCount: 2,
      limit: 5,
    });

    const matchingPattern = await prisma.workflowMemory.findFirst({
      where: {
        kind: expected.expectedPattern.kind as never,
        entityType: expected.expectedPattern.entityType,
        entityId: expected.expectedPattern.entityId,
        fieldPath: expected.expectedPattern.fieldPath,
        evidenceJson: {
          path: ["patternKey"],
          equals: `field_correction:${expected.expectedPattern.entityId}`,
        } as never,
      },
    });

    patternMemoryId = matchingPattern?.id ?? result.results[0]?.memoryId ?? null;

    const patternMemory = patternMemoryId
      ? await prisma.workflowMemory.findUnique({
          where: {
            id: patternMemoryId,
          },
        })
      : null;

    const actualTags = getStringArray(patternMemory?.tags);
    const actualMustNotDo = getStringArray(patternMemory?.mustNotDo);

    const patternPassed =
      Boolean(patternMemory) &&
      patternMemory?.kind === expected.expectedPattern.kind &&
      patternMemory?.entityType === expected.expectedPattern.entityType &&
      patternMemory?.entityId === expected.expectedPattern.entityId &&
      patternMemory?.fieldPath === expected.expectedPattern.fieldPath &&
      arrayIncludesAll(actualTags, expected.expectedPattern.requiredTags) &&
      arrayIncludesAll(actualMustNotDo, expected.expectedPattern.requiredMustNotDo) &&
      getPatternKey(patternMemory?.evidenceJson) ===
        `field_correction:${expected.expectedPattern.entityId}`;

    return buildPassedResult({
      packetId: manifest.packetId,
      category: manifest.category,
      title: manifest.title,
      expected: expected as unknown as Record<string, unknown>,
      actual: {
        sourceMemoryIds,
        candidatesFound: result.candidatesFound,
        patternsCreated: result.patternsCreated,
        patternsStrengthened: result.patternsStrengthened,
        patternMemoryId,
        patternKind: patternMemory?.kind ?? null,
        patternEntityType: patternMemory?.entityType ?? null,
        patternEntityId: patternMemory?.entityId ?? null,
        patternFieldPath: patternMemory?.fieldPath ?? null,
        patternTags: actualTags,
        patternMustNotDo: actualMustNotDo,
        patternKey: getPatternKey(patternMemory?.evidenceJson),
      },
      patternPassed,
    });
  } finally {
    if (patternMemoryId) {
      await prisma.workflowMemory
        .delete({
          where: {
            id: patternMemoryId,
          },
        })
        .catch(() => undefined);
    }

    if (sourceMemoryIds.length > 0) {
      await prisma.workflowMemory
        .deleteMany({
          where: {
            id: {
              in: sourceMemoryIds,
            },
          },
        })
        .catch(() => undefined);
    }
  }
}

async function readPacketManifests(): Promise<
  Array<{
    manifest: PacketManifest;
    packetRoot: string;
  }>
> {
  const entries = await readdir(PACKETS_ROOT, { withFileTypes: true });
  const packetDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const packets = [];

  for (const packetId of packetDirs) {
    const packetRoot = path.join(PACKETS_ROOT, packetId);
    const manifest = await readJson<PacketManifest>(
      path.join(packetRoot, "manifest.json"),
    );

    packets.push({
      manifest,
      packetRoot,
    });
  }

  return packets;
}

async function evaluatePacket(input: {
  manifest: PacketManifest;
  packetRoot: string;
}): Promise<Week5CaseResult> {
  const { manifest, packetRoot } = input;

  try {
    switch (manifest.category) {
      case "memory_writer":
        return await evaluateWriterPacket(packetRoot, manifest);

      case "memory_retrieval":
        return await evaluateRetrievalPacket(packetRoot, manifest);

      case "memory_safety":
      case "memory_conflict":
        return await evaluateSafetyLikePacket(packetRoot, manifest);

      case "memory_update":
        return await evaluateUpdatePacket(packetRoot, manifest);

      case "semantic_pattern":
        return await evaluatePatternPacket(packetRoot, manifest);

      default:
        throw new Error(`Unsupported Week 5 eval category: ${manifest.category}`);
    }
  } catch (error) {
    return buildErrorResult({
      packetId: manifest.packetId,
      category: manifest.category,
      title: manifest.title,
      error,
    });
  }
}

function metric(
  cases: Week5CaseResult[],
  key: keyof Pick<
    Week5CaseResult,
    | "memoryWritePassed"
    | "retrievalPassed"
    | "topKHitPassed"
    | "hitLoggingPassed"
    | "safetyPassed"
    | "conflictPassed"
    | "updatePassed"
    | "patternPassed"
  >,
): number | null {
  const scoped = cases.filter((item) => item[key] !== null);
  if (scoped.length === 0) return null;

  return scoped.filter((item) => item[key] === true).length / scoped.length;
}

function summarize(cases: Week5CaseResult[]): Week5MemoryEvalReport["summary"] {
  const totalPackets = cases.length;
  const passed = cases.filter((item) => item.passed).length;

  return {
    totalPackets,
    passed,
    failed: totalPackets - passed,

    memory_write_accuracy: metric(cases, "memoryWritePassed"),
    memory_recall_rate: metric(cases, "retrievalPassed"),
    memory_precision_rate: metric(cases, "retrievalPassed"),
    memory_top_k_hit_rate: metric(cases, "topKHitPassed"),
    memory_hit_logging_rate: metric(cases, "hitLoggingPassed"),
    memory_supported_review_rate: metric(cases, "safetyPassed"),
    memory_update_accuracy: metric(cases, "updatePassed"),
    semantic_pattern_creation_accuracy: metric(cases, "patternPassed"),

    unsafe_memory_overwrite_rate:
      totalPackets === 0
        ? 0
        : cases.filter((item) => item.unsafeMemoryOverwrite).length / totalPackets,
    false_approval_rate:
      totalPackets === 0
        ? 0
        : cases.filter((item) => item.falseApproval).length / totalPackets,
    source_of_truth_violation_rate:
      totalPackets === 0
        ? 0
        : cases.filter((item) => item.sourceOfTruthViolation).length / totalPackets,
  };
}

function buildMarkdownReport(report: Week5MemoryEvalReport): string {
  const lines: string[] = [];

  lines.push("# Week 5 Memory Eval Report");
  lines.push("");
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|---|---:|");

  for (const [key, value] of Object.entries(report.summary)) {
    if (typeof value === "number" && key !== "totalPackets" && key !== "passed" && key !== "failed") {
      lines.push(`| ${key} | ${formatPercent(value)} |`);
    } else {
      lines.push(`| ${key} | ${value} |`);
    }
  }

  lines.push("");
  lines.push("## Case Results");
  lines.push("");
  lines.push("| Packet | Category | Result | Error |");
  lines.push("|---|---|---:|---|");

  for (const item of report.cases) {
    lines.push(
      `| ${item.packetId} | ${item.category} | ${
        item.passed ? "PASS" : "FAIL"
      } | ${item.error ?? ""} |`,
    );
  }

  lines.push("");
  lines.push("## Safety Claim");
  lines.push("");
  lines.push("- Memory is evaluated as workflow context, not source-of-truth evidence.");
  lines.push("- Expected unsafe overwrite, false approval, and source-of-truth violation rates are 0%.");
  lines.push("- Memory may route to review, request verification, strengthen, weaken, retire, or generalize.");
  lines.push("- Memory must not approve, reject, overwrite current documents, or replace current policy evidence.");
  lines.push("");

  return lines.join("\n");
}

async function main() {
  await mkdir(REPORT_ROOT, { recursive: true });

  console.log("Loading Week 5 memory seed...");
  await loadWeek5MemorySeed({ log: false });

  const packets = await readPacketManifests();
  const cases: Week5CaseResult[] = [];

  for (const packet of packets) {
    console.log(`Evaluating ${packet.manifest.packetId} (${packet.manifest.category})`);
    const result = await evaluatePacket(packet);
    cases.push(result);
    console.log(`${result.passed ? "PASS" : "FAIL"} ${result.packetId}`);
  }

  const report: Week5MemoryEvalReport = {
    schemaVersion: REPORT_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    datasetRoot: DATASET_ROOT,
    summary: summarize(cases),
    cases,
  };

  await writeJson(JSON_REPORT_PATH, report);
  await writeFile(MARKDOWN_REPORT_PATH, buildMarkdownReport(report));

  console.log("");
  console.log("Week 5 memory eval complete.");
  console.log(`JSON report: ${JSON_REPORT_PATH}`);
  console.log(`Markdown report: ${MARKDOWN_REPORT_PATH}`);
  console.log("");
  console.log(JSON.stringify(report.summary, null, 2));

  if (report.summary.failed > 0) {
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  main()
    .catch((error) => {
      console.error("Week 5 memory eval failed.");
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

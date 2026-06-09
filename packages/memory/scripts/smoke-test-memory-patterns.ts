// packages/memory/scripts/smoke-test-memory-patterns.ts

import assert from "node:assert/strict";
import { Prisma, prisma } from "@repo/db";
import { maybeCreatePatternMemory, retrieveRelevantMemories } from "../index";

type WorkflowMemoryKindValue =
  | "HUMAN_CORRECTION"
  | "PRIOR_REJECTION"
  | "PRIOR_REVIEW_DECISION"
  | "POLICY_HISTORY";

type WorkflowMemoryRiskLevelValue = "LOW" | "MEDIUM" | "HIGH";

const RUN_LABEL = `week5-memory-patterns-smoke-${Date.now()}`;

/**
 * Human-readable demo IDs for logs.
 * These make the smoke output understandable.
 */
const DEMO_FIELD_PATH = "policyNumber";
const DEMO_VENDOR_ID = "VEND-DEMO-201";
const DEMO_CLAIMANT_ID = "CUST-DEMO-101";

/**
 * Unique DB IDs for test isolation.
 * These avoid collision with previous smoke runs or seeded Week 5 memories.
 */
const SMOKE_FIELD_PATH = `policyNumber_${RUN_LABEL}`;
const SMOKE_VENDOR_ID = `VEND-PATTERN-${RUN_LABEL}`;
const SMOKE_CLAIMANT_ID = `CUST-PATTERN-${RUN_LABEL}`;

const createdMemoryIds = new Set<string>();

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function section(title: string) {
  console.log("");
  console.log(title);
  console.log("-".repeat(title.length));
}

function printStep(title: string, lines: string[]) {
  console.log("");
  console.log(title);
  for (const line of lines) {
    console.log(`  ${line}`);
  }
}

function shortId(id: string): string {
  return id.slice(0, 8);
}

function normalizeToken(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function formatMatchSignals(
  matchedOn: Array<{ type: string; value: string; points: number }>,
): string {
  if (matchedOn.length === 0) {
    return "no structured match signals";
  }

  return matchedOn
    .map((signal) => `${signal.type}:${signal.value}(+${signal.points})`)
    .join(", ");
}

function printMemoryStory(
  memories: Array<{
    id: string;
    kind: string;
    summary: string;
  }>,
) {
  for (const [index, memory] of memories.entries()) {
    console.log(
      `  ${index + 1}. ${memory.kind} memory ${shortId(memory.id)} → ${
        memory.summary
      }`,
    );
  }
}

async function createSourceMemory(input: {
  label: string;
  kind: WorkflowMemoryKindValue;
  riskLevel: WorkflowMemoryRiskLevelValue;
  confidence?: number;
  entityType: string | null;
  entityId: string | null;
  fieldPath: string | null;
  summary: string;
  safeUse?: string;
  mustNotDo?: string[];
  tags?: string[];
}) {
  const memory = await prisma.workflowMemory.create({
    data: {
      kind: input.kind,
      status: "ACTIVE",
      riskLevel: input.riskLevel,
      confidence: input.confidence ?? 0.72,

      summary: input.summary,
      safeUse:
        input.safeUse ??
        "Use only as routing context for reviewer verification.",
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
      tags: toPrismaJson(input.tags ?? ["week5_pattern_smoke"]),

      evidenceJson: toPrismaJson({
        smokeTest: true,
        runLabel: RUN_LABEL,
        label: input.label,
        sourceObservationIds: [`OBS-${input.label}`],
        sourcePacketIds: [`packet-${input.label}`],
        sourceWeeks: [5],
      }),

      confirmedCount: 0,
      contradictedCount: 0,
    },
  });

  createdMemoryIds.add(memory.id);

  return memory;
}

async function getMemoryOrThrow(memoryId: string) {
  const memory = await prisma.workflowMemory.findUnique({
    where: {
      id: memoryId,
    },
  });

  assert(memory, `Expected memory ${memoryId} to exist.`);

  return memory;
}

function getGeneralizedFromMemoryIds(evidenceJson: unknown): string[] {
  if (
    typeof evidenceJson !== "object" ||
    evidenceJson === null ||
    Array.isArray(evidenceJson)
  ) {
    return [];
  }

  const value = (evidenceJson as Record<string, unknown>)
    .generalizedFromMemoryIds;

  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

async function getLatestGeneralizedUpdate(memoryId: string) {
  const update = await prisma.memoryUpdate.findFirst({
    where: {
      memoryId,
      updateType: "GENERALIZED",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  assert(update, `Expected GENERALIZED MemoryUpdate for ${memoryId}.`);

  return update;
}

async function testRecurringFieldCorrectionPattern() {
  section("Scenario 1: repeated field corrections → RECURRING_ERROR_PATTERN");

  printStep("Original past claim outcomes", [
    `1. CLM-OLD-FIELD-1 → reviewer corrected ${DEMO_FIELD_PATH}.`,
    `2. CLM-OLD-FIELD-2 → reviewer corrected ${DEMO_FIELD_PATH}.`,
    `3. CLM-OLD-FIELD-3 → reviewer corrected ${DEMO_FIELD_PATH}.`,
  ]);

  const sourceMemories = [];

  for (const index of [1, 2, 3]) {
    const memory = await createSourceMemory({
      label: `field-policy-number-${index}`,
      kind: "HUMAN_CORRECTION",
      riskLevel: "MEDIUM",
      entityType: "CLAIMANT",
      entityId: `CUST-PATTERN-FIELD-${index}-${RUN_LABEL}`,
      fieldPath: SMOKE_FIELD_PATH,
      summary: `Reviewer corrected ${DEMO_FIELD_PATH} in old claim CLM-OLD-FIELD-${index}.`,
      safeUse: `Ask reviewer to verify ${DEMO_FIELD_PATH} when current extraction is missing or low-confidence.`,
      mustNotDo: [
        `do not auto-correct ${DEMO_FIELD_PATH}`,
        `do not overwrite extractedJson.${DEMO_FIELD_PATH}`,
        "do not approve from memory",
      ],
      tags: [
        "human_verified",
        "field_correction",
        `${normalizeToken(SMOKE_FIELD_PATH)}_missing`,
      ],
    });

    sourceMemories.push(memory);
  }

  printStep("Episodic memories written", [
    "Each old reviewer correction became one HUMAN_CORRECTION memory.",
    `All 3 memories share the same fieldPath: ${DEMO_FIELD_PATH}.`,
  ]);

  printMemoryStory(sourceMemories);

  printStep("Pattern detection", [
    "Group rule: HUMAN_CORRECTION memories grouped by fieldPath.",
    `Group key: fieldPath=${DEMO_FIELD_PATH}.`,
    "Found: 3 matching memories.",
    "Threshold: 3.",
    "Result: PASS.",
  ]);

  const result = await maybeCreatePatternMemory({
    sourceMemoryIds: sourceMemories.map((memory) => memory.id),
    minFieldCorrectionCount: 3,
  });

  assert.equal(result.results.length, 1);
  assert.equal(result.patternsCreated + result.patternsStrengthened, 1);

  const patternResult = result.results[0]!;
  const patternMemory = await getMemoryOrThrow(patternResult.memoryId);

  if (patternResult.created) {
    createdMemoryIds.add(patternMemory.id);
  }

  const sourceIds = getGeneralizedFromMemoryIds(patternMemory.evidenceJson);
  assert.equal(sourceIds.length, 3);

  const update = await getLatestGeneralizedUpdate(patternMemory.id);

  assert.equal(patternMemory.kind, "RECURRING_ERROR_PATTERN");
  assert.equal(patternMemory.entityType, "FIELD_PATH");
  assert.equal(patternMemory.entityId, normalizeToken(SMOKE_FIELD_PATH));
  assert.equal(patternMemory.fieldPath, "missingFields");

  printStep("Semantic memory created", [
    `Kind: ${patternMemory.kind}.`,
    `Why: ${sourceIds.length} repeated corrections for ${DEMO_FIELD_PATH}.`,
    `Safe use: ask reviewer to verify ${DEMO_FIELD_PATH}.`,
    `Must not: auto-correct ${DEMO_FIELD_PATH} or overwrite extractedJson.`,
    `Audit: MemoryUpdate=${update.updateType}; source memory links=${sourceIds.length}.`,
  ]);

  const futureClaimState = {
    extractedJson: {
      customerId: "CUST-FUTURE-FIELD",
      claimNumber: "CLM-NEW-FIELD-1",
      lossType: "own_damage",
    },
    validationJson: {
      missingFields: [SMOKE_FIELD_PATH],
      requiredEvidence: [],
    },
    missingFields: [SMOKE_FIELD_PATH],
    requiredEvidence: [],
  };

  const retrieval = await retrieveRelevantMemories({
    claimState: futureClaimState,
    writeHits: false,
    limit: 5,
  });

  const retrieved = retrieval.memories.find(
    (memory) => memory.memoryId === patternMemory.id,
  );

  assert(
    retrieved,
    `Expected recurring ${DEMO_FIELD_PATH} pattern to be retrieved.`,
  );

  printStep("Future claim", [
    "CLM-NEW-FIELD-1 arrives.",
    `Current validation says missingFields=[${DEMO_FIELD_PATH}].`,
  ]);

  printStep("Semantic memory retrieved", [
    `Retrieved: ${retrieved.kind}.`,
    `Score: ${retrieved.score}.`,
    `Matched on: ${formatMatchSignals(retrieved.matchedOn)}.`,
    "Outcome: route to reviewer verification; do not auto-fill the field.",
  ]);

  console.log("✓ scenario passed");
}

async function testVendorPattern() {
  section("Scenario 2: repeated vendor invoice conflicts → VENDOR_PATTERN");

  printStep("Original past claim outcomes", [
    `1. CLM-OLD-VENDOR-1 → vendor ${DEMO_VENDOR_ID} had invoice amount conflict.`,
    `2. CLM-OLD-VENDOR-2 → vendor ${DEMO_VENDOR_ID} had invoice amount conflict.`,
  ]);

  const sourceMemories = [];

  for (const index of [1, 2]) {
    const memory = await createSourceMemory({
      label: `vendor-invoice-conflict-${index}`,
      kind: "PRIOR_REVIEW_DECISION",
      riskLevel: "HIGH",
      entityType: "VENDOR",
      entityId: SMOKE_VENDOR_ID,
      fieldPath: "invoice.amount",
      summary: `Vendor invoice amount conflict required review in old claim CLM-OLD-VENDOR-${index}.`,
      safeUse: "Route to human review when current vendor invoices disagree.",
      mustNotDo: [
        "do not choose invoice amount automatically",
        "do not reject based only on vendor memory",
        "do not overwrite extractedJson",
      ],
      tags: ["invoice_conflict", "amount_mismatch", "vendor_risk"],
    });

    sourceMemories.push(memory);
  }

  printStep("Episodic memories written", [
    "Each old review outcome became one PRIOR_REVIEW_DECISION memory.",
    `Both memories are scoped to vendor ${DEMO_VENDOR_ID}.`,
    "Both carry invoice_conflict / amount_mismatch tags.",
  ]);

  printMemoryStory(sourceMemories);

  printStep("Pattern detection", [
    "Group rule: VENDOR-scoped memories grouped by vendorId + risk tag.",
    `Group key: vendor=${DEMO_VENDOR_ID}, riskTag=invoice_conflict.`,
    "Found: 2 matching memories.",
    "Threshold: 2.",
    "Result: PASS.",
  ]);

  const result = await maybeCreatePatternMemory({
    sourceMemoryIds: sourceMemories.map((memory) => memory.id),
    minVendorRiskCount: 2,
  });

  assert.equal(result.results.length, 1);
  assert.equal(result.patternsCreated + result.patternsStrengthened, 1);

  const patternResult = result.results[0]!;
  const patternMemory = await getMemoryOrThrow(patternResult.memoryId);

  if (patternResult.created) {
    createdMemoryIds.add(patternMemory.id);
  }

  const sourceIds = getGeneralizedFromMemoryIds(patternMemory.evidenceJson);
  assert.equal(sourceIds.length, 2);

  const update = await getLatestGeneralizedUpdate(patternMemory.id);

  assert.equal(patternMemory.kind, "VENDOR_PATTERN");
  assert.equal(patternMemory.entityType, "VENDOR");
  assert.equal(patternMemory.entityId, SMOKE_VENDOR_ID);

  printStep("Semantic memory created", [
    `Kind: ${patternMemory.kind}.`,
    `Why: ${sourceIds.length} repeated invoice-conflict memories for ${DEMO_VENDOR_ID}.`,
    "Safe use: route future matching vendor invoice conflicts to review.",
    "Must not: choose invoice amount or reject based only on vendor memory.",
    `Audit: MemoryUpdate=${update.updateType}; source memory links=${sourceIds.length}.`,
  ]);

  const futureClaimState = {
    extractedJson: {
      claimNumber: "CLM-NEW-VENDOR-1",
      vendor: {
        vendorId: SMOKE_VENDOR_ID,
      },
      invoice: {
        amount: 75000,
      },
    },
    validationJson: {
      conflicts: ["invoice amount differs between invoice and estimate"],
      missingFields: [],
      requiredEvidence: [],
    },
    missingFields: [],
    requiredEvidence: [],
  };

  const retrieval = await retrieveRelevantMemories({
    claimState: futureClaimState,
    writeHits: false,
    limit: 5,
  });

  const retrieved = retrieval.memories.find(
    (memory) => memory.memoryId === patternMemory.id,
  );

  assert(retrieved, "Expected vendor pattern to be retrieved.");

  printStep("Future claim", [
    `CLM-NEW-VENDOR-1 arrives from vendor ${DEMO_VENDOR_ID}.`,
    "Current validation shows invoice amount conflict.",
  ]);

  printStep("Semantic memory retrieved", [
    `Retrieved: ${retrieved.kind}.`,
    `Score: ${retrieved.score}.`,
    `Matched on: ${formatMatchSignals(retrieved.matchedOn)}.`,
    "Outcome: route to human review; do not decide invoice amount from memory.",
  ]);

  console.log("✓ scenario passed");
}

async function testClaimantPattern() {
  section("Scenario 3: repeated claimant duplicate signals → CLAIMANT_PATTERN");

  printStep("Original past claim outcomes", [
    `1. CLM-OLD-CLAIMANT-1 → claimant ${DEMO_CLAIMANT_ID} had duplicate-like signal.`,
    `2. CLM-OLD-CLAIMANT-2 → claimant ${DEMO_CLAIMANT_ID} had duplicate-like signal.`,
  ]);

  const sourceMemories = [];

  for (const index of [1, 2]) {
    const memory = await createSourceMemory({
      label: `claimant-duplicate-signal-${index}`,
      kind: "PRIOR_REJECTION",
      riskLevel: "HIGH",
      entityType: "CLAIMANT",
      entityId: SMOKE_CLAIMANT_ID,
      fieldPath: "duplicateSignals",
      summary: `Claimant had duplicate-like rejection signal in old claim CLM-OLD-CLAIMANT-${index}.`,
      safeUse:
        "Use as a routing signal only when current claim has similar current signals.",
      mustNotDo: [
        "do not auto-reject as duplicate",
        "do not draft denial from memory",
        "do not overwrite extractedJson",
      ],
      tags: ["duplicate_signal", "prior_rejection", "claimant_risk"],
    });

    sourceMemories.push(memory);
  }

  printStep("Episodic memories written", [
    "Each old rejection became one PRIOR_REJECTION memory.",
    `Both memories are scoped to claimant ${DEMO_CLAIMANT_ID}.`,
    "Both carry duplicate_signal / claimant_risk tags.",
  ]);

  printMemoryStory(sourceMemories);

  printStep("Pattern detection", [
    "Group rule: CLAIMANT-scoped memories grouped by claimantId + risk tag.",
    `Group key: claimant=${DEMO_CLAIMANT_ID}, riskTag=duplicate_signal.`,
    "Found: 2 matching memories.",
    "Threshold: 2.",
    "Result: PASS.",
  ]);

  const result = await maybeCreatePatternMemory({
    sourceMemoryIds: sourceMemories.map((memory) => memory.id),
    minClaimantPatternCount: 2,
  });

  assert.equal(result.results.length, 1);
  assert.equal(result.patternsCreated + result.patternsStrengthened, 1);

  const patternResult = result.results[0]!;
  const patternMemory = await getMemoryOrThrow(patternResult.memoryId);

  if (patternResult.created) {
    createdMemoryIds.add(patternMemory.id);
  }

  const sourceIds = getGeneralizedFromMemoryIds(patternMemory.evidenceJson);
  assert.equal(sourceIds.length, 2);

  const update = await getLatestGeneralizedUpdate(patternMemory.id);

  assert.equal(patternMemory.kind, "CLAIMANT_PATTERN");
  assert.equal(patternMemory.entityType, "CLAIMANT");
  assert.equal(patternMemory.entityId, SMOKE_CLAIMANT_ID);

  printStep("Semantic memory created", [
    `Kind: ${patternMemory.kind}.`,
    `Why: ${sourceIds.length} repeated duplicate-signal memories for ${DEMO_CLAIMANT_ID}.`,
    "Safe use: route similar future claims to review.",
    "Must not: auto-reject as duplicate or draft denial from memory.",
    `Audit: MemoryUpdate=${update.updateType}; source memory links=${sourceIds.length}.`,
  ]);

  const futureClaimState = {
    extractedJson: {
      customerId: SMOKE_CLAIMANT_ID,
      claimNumber: "CLM-NEW-CLAIMANT-1",
      lossType: "own_damage",
    },
    validationJson: {
      riskSignals: ["duplicate_signal"],
      missingFields: [],
      requiredEvidence: [],
    },
    missingFields: [],
    requiredEvidence: [],
  };

  const retrieval = await retrieveRelevantMemories({
    claimState: futureClaimState,
    writeHits: false,
    limit: 5,
  });

  const retrieved = retrieval.memories.find(
    (memory) => memory.memoryId === patternMemory.id,
  );

  assert(retrieved, "Expected claimant pattern to be retrieved.");

  printStep("Future claim", [
    `CLM-NEW-CLAIMANT-1 arrives from claimant ${DEMO_CLAIMANT_ID}.`,
    "Current validation has duplicate_signal.",
  ]);

  printStep("Semantic memory retrieved", [
    `Retrieved: ${retrieved.kind}.`,
    `Score: ${retrieved.score}.`,
    `Matched on: ${formatMatchSignals(retrieved.matchedOn)}.`,
    "Outcome: route to human review; do not auto-reject.",
  ]);

  console.log("✓ scenario passed");
}

async function cleanup() {
  const memoryIds = Array.from(createdMemoryIds);

  if (memoryIds.length === 0) {
    return;
  }

  await prisma.workflowMemory.deleteMany({
    where: {
      id: {
        in: memoryIds,
      },
    },
  });
}

async function main() {
  try {
    console.log("Week 5 Day 7 semantic pattern smoke test started");
    console.log(`runLabel: ${RUN_LABEL}`);
    console.log("");
    console.log(
      [
        "Test loop:",
        "past claim outcomes",
        "→ episodic WorkflowMemory rows",
        "→ deterministic pattern detection",
        "→ semantic WorkflowMemory row",
        "→ future claim retrieval check",
        "",
        "Note: this is package-level smoke testing, not a full ExtractionRun UI demo.",
      ].join("\n"),
    );

    await testRecurringFieldCorrectionPattern();
    await testVendorPattern();
    await testClaimantPattern();

    console.log("");
    console.log("Week 5 Day 7 semantic pattern smoke test passed");
  } finally {
    await cleanup();
  }
}

if (import.meta.main) {
  main()
    .catch((error) => {
      console.error("Week 5 Day 7 semantic pattern smoke test failed.");
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
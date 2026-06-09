import assert from "node:assert/strict";
import { Prisma, prisma } from "@repo/db";
import {
  maybeCreatePatternMemory,
  retrieveRelevantMemories,
} from "../index";

type WorkflowMemoryKindValue =
  | "HUMAN_CORRECTION"
  | "PRIOR_REJECTION"
  | "PRIOR_REVIEW_DECISION"
  | "POLICY_HISTORY";

type WorkflowMemoryRiskLevelValue = "LOW" | "MEDIUM" | "HIGH";

const RUN_LABEL = `week5-memory-patterns-smoke-${Date.now()}`;

const createdMemoryIds = new Set<string>();

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
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

  const value = (evidenceJson as Record<string, unknown>).generalizedFromMemoryIds;

  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

async function testRecurringFieldCorrectionPattern() {
  const sourceMemories = [];

  for (const index of [1, 2, 3]) {
    sourceMemories.push(
      await createSourceMemory({
        label: `field-policy-number-${index}`,
        kind: "HUMAN_CORRECTION",
        riskLevel: "MEDIUM",
        entityType: "CLAIMANT",
        entityId: `CUST-PATTERN-FIELD-${index}`,
        fieldPath: "policyNumber",
        summary: `Reviewer corrected policyNumber in source memory ${index}.`,
        safeUse:
          "Ask reviewer to verify policyNumber when current extraction is missing or low-confidence.",
        mustNotDo: [
          "do not auto-correct policyNumber",
          "do not overwrite extractedJson.policyNumber",
          "do not approve from memory",
        ],
        tags: ["human_verified", "field_correction", "policy_number_missing"],
      }),
    );
  }

  const result = await maybeCreatePatternMemory({
    sourceMemoryIds: sourceMemories.map((memory) => memory.id),
    minFieldCorrectionCount: 3,
  });

  assert.equal(result.patternsCreated, 1);
  assert.equal(result.results.length, 1);

  const patternMemory = await getMemoryOrThrow(result.results[0]!.memoryId);
  createdMemoryIds.add(patternMemory.id);

  assert.equal(patternMemory.kind, "RECURRING_ERROR_PATTERN");
  assert.equal(patternMemory.entityType, "FIELD_PATH");
  assert.equal(patternMemory.entityId, "policy_number");
  assert.equal(patternMemory.fieldPath, "missingFields");

  const sourceIds = getGeneralizedFromMemoryIds(patternMemory.evidenceJson);
  assert.equal(sourceIds.length, 3);

  const update = await prisma.memoryUpdate.findFirst({
    where: {
      memoryId: patternMemory.id,
      updateType: "GENERALIZED",
    },
  });

  assert(update, "Expected GENERALIZED MemoryUpdate for pattern memory.");

  const retrieval = await retrieveRelevantMemories({
    claimState: {
      extractedJson: {
        customerId: "CUST-FUTURE-FIELD",
        claimNumber: "CLM-FUTURE-FIELD",
        lossType: "own_damage",
      },
      validationJson: {
        missingFields: ["policyNumber"],
        requiredEvidence: [],
      },
      missingFields: ["policyNumber"],
      requiredEvidence: [],
    },
    writeHits: false,
    limit: 5,
  });

  assert(
    retrieval.memories.some(
      (memory) => memory.memoryId === patternMemory.id,
    ),
    "Expected recurring policyNumber pattern to be retrievable for a future missing policyNumber claim.",
  );

  console.log("✓ recurring field correction pattern created and retrieved");
}

async function testVendorPattern() {
  const sourceMemories = [];

  for (const index of [1, 2]) {
    sourceMemories.push(
      await createSourceMemory({
        label: `vendor-invoice-conflict-${index}`,
        kind: "PRIOR_REVIEW_DECISION",
        riskLevel: "HIGH",
        entityType: "VENDOR",
        entityId: "VEND-PATTERN-001",
        fieldPath: "invoice.amount",
        summary: `Vendor invoice amount conflict required review in source memory ${index}.`,
        safeUse:
          "Route to human review when current vendor invoices disagree.",
        mustNotDo: [
          "do not choose invoice amount automatically",
          "do not reject based only on vendor memory",
          "do not overwrite extractedJson",
        ],
        tags: ["invoice_conflict", "amount_mismatch", "vendor_risk"],
      }),
    );
  }

  const result = await maybeCreatePatternMemory({
    sourceMemoryIds: sourceMemories.map((memory) => memory.id),
    minVendorRiskCount: 2,
  });

  assert.equal(result.patternsCreated, 1);

  const patternMemory = await getMemoryOrThrow(result.results[0]!.memoryId);
  createdMemoryIds.add(patternMemory.id);

  assert.equal(patternMemory.kind, "VENDOR_PATTERN");
  assert.equal(patternMemory.entityType, "VENDOR");
  assert.equal(patternMemory.entityId, "VEND-PATTERN-001");

  console.log("✓ vendor pattern created");
}

async function testClaimantPattern() {
  const sourceMemories = [];

  for (const index of [1, 2]) {
    sourceMemories.push(
      await createSourceMemory({
        label: `claimant-duplicate-signal-${index}`,
        kind: "PRIOR_REJECTION",
        riskLevel: "HIGH",
        entityType: "CLAIMANT",
        entityId: "CUST-PATTERN-001",
        fieldPath: "duplicateSignals",
        summary: `Claimant had repeated duplicate-like review signal ${index}.`,
        safeUse:
          "Use as a routing signal only when current claim has similar current signals.",
        mustNotDo: [
          "do not auto-reject as duplicate",
          "do not draft denial from memory",
          "do not overwrite extractedJson",
        ],
        tags: ["duplicate_signal", "prior_rejection", "claimant_risk"],
      }),
    );
  }

  const result = await maybeCreatePatternMemory({
    sourceMemoryIds: sourceMemories.map((memory) => memory.id),
    minClaimantPatternCount: 2,
  });

  assert.equal(result.patternsCreated, 1);

  const patternMemory = await getMemoryOrThrow(result.results[0]!.memoryId);
  createdMemoryIds.add(patternMemory.id);

  assert.equal(patternMemory.kind, "CLAIMANT_PATTERN");
  assert.equal(patternMemory.entityType, "CLAIMANT");
  assert.equal(patternMemory.entityId, "CUST-PATTERN-001");

  console.log("✓ claimant pattern created");
}

async function cleanup() {
  await prisma.workflowMemory.deleteMany({
    where: {
      id: {
        in: Array.from(createdMemoryIds),
      },
    },
  });
}

async function main() {
  try {
    console.log("Week 5 Day 7 semantic pattern smoke test started");
    console.log(`runLabel: ${RUN_LABEL}`);

    await testRecurringFieldCorrectionPattern();
    await testVendorPattern();
    await testClaimantPattern();

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
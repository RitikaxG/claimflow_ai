// packages/memory/scripts/smoke-test-memory-retrieval.ts

import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { prisma, Prisma } from "@repo/db";
import { loadWeek5MemorySeed } from "../seed/load-week5-memory-seed";
import { retrieveRelevantMemories } from "../retrieval/retrieve-relevant-memories";
import { WEEK5_MEMORY_ROOT } from "../utils/paths";
import { isRecord } from "../utils/json";
import type { RelevantMemory } from "../types";

type ExpectedMemoryHits = {
  packetId: string;
  expectedHitMemorySeedIds: string[];
  expectedIgnoredMemorySeedIds: string[];
  expectedUse: string;
  mustNotUseFor: string[];
};

type RetrievalScenario = {
  title: string;
  packetId?: string;
  claimSummary: Record<string, unknown>;
  memoryRuleBeingTested: string;
  expectedBehavior: string;
  safetyRule: string;
};

type RelevantMemoryDebugRow = {
  seedId: string;
  memoryId: string;
  score: number;
  kind: string;
  riskLevel: string;
  status: string;
  entityType: string | null | undefined;
  entityId: string | null | undefined;
  fieldPath: string | null | undefined;
  matchedOn: string[];
  retrievalReason: string;
  summary: string;
  safeUse: string;
  mustNotDo: string[];
};

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf-8");

  return JSON.parse(raw) as T;
}

function packetPath(packetId: string, filename: string): string {
  return path.join(WEEK5_MEMORY_ROOT, "packets", packetId, filename);
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getMemorySeedId(evidenceJson: unknown): string | null {
  if (!isRecord(evidenceJson)) {
    return null;
  }

  const memorySeedId = evidenceJson.memorySeedId;

  return typeof memorySeedId === "string" ? memorySeedId : null;
}

function getNestedValue(value: unknown, pathParts: string[]): unknown {
  let current = value;

  for (const part of pathParts) {
    if (!isRecord(current)) {
      return null;
    }

    current = current[part];
  }

  return current;
}

function getStringAtPaths(value: unknown, paths: string[][]): string | null {
  for (const pathParts of paths) {
    const found = getNestedValue(value, pathParts);

    if (typeof found === "string" && found.trim().length > 0) {
      return found.trim();
    }
  }

  return null;
}

function getStringArrayAtPath(value: unknown, pathParts: string[]): string[] {
  const found = getNestedValue(value, pathParts);

  if (!Array.isArray(found)) {
    return [];
  }

  return found.filter((item): item is string => {
    return typeof item === "string" && item.trim().length > 0;
  });
}

function buildClaimSummary(claimState: unknown): Record<string, unknown> {
  const extractedJson = isRecord(claimState)
    ? claimState.extractedJson
    : null;

  const validationJson = isRecord(claimState)
    ? claimState.validationJson
    : null;

  return {
    customerId:
      getStringAtPaths(claimState, [["customerId"], ["claimantId"]]) ??
      getStringAtPaths(extractedJson, [["customerId"], ["claimantId"]]),

    vendorId:
      getStringAtPaths(claimState, [["vendorId"]]) ??
      getStringAtPaths(extractedJson, [["vendorId"], ["vendor", "vendorId"]]),

    policyId:
      getStringAtPaths(claimState, [["policyId"]]) ??
      getStringAtPaths(extractedJson, [["policyId"], ["policy", "policyId"]]),

    claimNumber: getStringAtPaths(extractedJson, [["claimNumber"]]),

    insuredName:
      getStringAtPaths(extractedJson, [["insuredName"], ["claimantName"]]),

    lossType:
      getStringAtPaths(extractedJson, [
        ["lossType"],
        ["claim", "lossType"],
        ["incident", "lossType"],
      ]),

    missingFields:
      getStringArrayAtPath(claimState, ["missingFields"]).length > 0
        ? getStringArrayAtPath(claimState, ["missingFields"])
        : getStringArrayAtPath(validationJson, ["missingFields"]),

    requiredEvidence:
      getStringArrayAtPath(claimState, ["requiredEvidence"]).length > 0
        ? getStringArrayAtPath(claimState, ["requiredEvidence"])
        : getStringArrayAtPath(validationJson, ["requiredEvidence"]),
  };
}

function scenarioForPacket(input: {
  packetId: string;
  claimState: unknown;
  expected: ExpectedMemoryHits;
}): RetrievalScenario {
  if (input.packetId === "w5-001-prior-policy-number-correction") {
    return {
      title: "1. Prior human correction retrieval: same claimant + same missing field",
      packetId: input.packetId,
      claimSummary: buildClaimSummary(input.claimState),
      memoryRuleBeingTested:
        "A HUMAN_CORRECTION memory for policyNumber should retrieve when the same stable claimant has a current policyNumber issue.",
      expectedBehavior:
        "ClaimFlow should surface the prior correction as reviewer-verification context.",
      safetyRule:
        "Memory may route to review or ask the reviewer to verify policyNumber. It must not overwrite policyNumber, approve, or reject.",
    };
  }

  if (input.packetId === "w5-002-prior-rejection-route-review") {
    return {
      title: "2. Prior rejection retrieval: same claimant routes to human review",
      packetId: input.packetId,
      claimSummary: buildClaimSummary(input.claimState),
      memoryRuleBeingTested:
        "A PRIOR_REJECTION memory should retrieve only when the current claim has the same stable claimant id.",
      expectedBehavior:
        "ClaimFlow should use the memory as a routing-risk signal and escalate to human review.",
      safetyRule:
        "Prior rejection memory is not denial evidence. It must not auto-reject or draft denial reasoning.",
    };
  }

  if (input.packetId === "w5-003-irrelevant-same-name-ignore") {
    return {
      title: "3. Same-name trap: different stable entity should not retrieve claimant memory",
      packetId: input.packetId,
      claimSummary: buildClaimSummary(input.claimState),
      memoryRuleBeingTested:
        "Same or similar name is not enough. Entity-scoped memory requires stable claimant/vendor/policy identity.",
      expectedBehavior:
        "ClaimFlow should return no relevant entity memory for this claim.",
      safetyRule:
        "Do not match claimant-risk memory by name-only similarity.",
    };
  }

  return {
    title: `Packet retrieval: ${input.packetId}`,
    packetId: input.packetId,
    claimSummary: buildClaimSummary(input.claimState),
    memoryRuleBeingTested: input.expected.expectedUse,
    expectedBehavior: `Expected seed hits: ${input.expected.expectedHitMemorySeedIds.join(
      ", ",
    )}`,
    safetyRule: `Must not use for: ${input.expected.mustNotUseFor.join(", ")}`,
  };
}

function formatMatchedOn(memory: RelevantMemory): string[] {
  if (memory.matchedOn.length === 0) {
    return ["none"];
  }

  return memory.matchedOn.map((signal) => {
    const prefix = signal.points >= 0 ? "+" : "";
    return `${signal.type}(${prefix}${signal.points}: ${signal.value})`;
  });
}

function formatMustNotDo(memory: RelevantMemory): string[] {
  return memory.mustNotDo.length > 0 ? memory.mustNotDo : ["none"];
}

async function getDebugRowsForRelevantMemories(
  memories: RelevantMemory[],
): Promise<RelevantMemoryDebugRow[]> {
  if (memories.length === 0) {
    return [];
  }

  const dbMemories = await prisma.workflowMemory.findMany({
    where: {
      id: {
        in: memories.map((memory) => memory.memoryId),
      },
    },
    select: {
      id: true,
      evidenceJson: true,
    },
  });

  const seedIdByMemoryId = new Map(
    dbMemories.map((memory) => [
      memory.id,
      getMemorySeedId(memory.evidenceJson),
    ]),
  );

  return memories.map((memory) => {
    return {
      seedId: seedIdByMemoryId.get(memory.memoryId) ?? "UNKNOWN_SEED",
      memoryId: memory.memoryId,
      score: memory.score,
      kind: memory.kind,
      riskLevel: memory.riskLevel,
      status: memory.status,
      entityType: memory.entityType,
      entityId: memory.entityId,
      fieldPath: memory.fieldPath,
      matchedOn: formatMatchedOn(memory),
      retrievalReason: memory.retrievalReason,
      summary: memory.summary,
      safeUse: memory.safeUse,
      mustNotDo: formatMustNotDo(memory),
    };
  });
}

function printScenarioHeader(title: string) {
  console.log("");
  console.log(title);
  console.log("-".repeat(title.length));
}

function printRetrievalBehavior(input: {
  scenario: RetrievalScenario;
  expectedHitSeedIds: string[];
  expectedIgnoredSeedIds: string[];
  expectedUse: string;
  mustNotUseFor: string[];
  totalCandidates: number;
  writtenHitCount: number;
  rows: RelevantMemoryDebugRow[];
}) {
  printScenarioHeader(input.scenario.title);

  console.log("Current claim:");
  console.log(JSON.stringify(input.scenario.claimSummary, null, 2));

  console.log("Rule being tested:");
  console.log(`  ${input.scenario.memoryRuleBeingTested}`);

  console.log("Expected behavior:");
  console.log(`  ${input.scenario.expectedBehavior}`);

  console.log("Safety rule:");
  console.log(`  ${input.scenario.safetyRule}`);

  console.log("Retrieval result:");
  console.log(
    JSON.stringify(
      {
        totalCandidates: input.totalCandidates,
        writtenHitCount: input.writtenHitCount,
        expectedHitSeedIds: input.expectedHitSeedIds,
        expectedIgnoredSeedIds: input.expectedIgnoredSeedIds,
        actualRetrievedSeedIds: input.rows.map((row) => row.seedId),
      },
      null,
      2,
    ),
  );

  if (input.rows.length === 0) {
    console.log("Retrieved memories:");
    console.log("  none");
    console.log("Verdict:");
    console.log("  PASS - no memory was retrieved, as expected.");
    return;
  }

  console.log("Retrieved memories:");

  for (const [index, row] of input.rows.entries()) {
    console.log(`  #${index + 1}`);
    console.log(`    seedId: ${row.seedId}`);
    console.log(`    memoryId: ${row.memoryId}`);
    console.log(`    kind: ${row.kind}`);
    console.log(`    status: ${row.status}`);
    console.log(`    riskLevel: ${row.riskLevel}`);
    console.log(`    scope: ${row.entityType ?? "null"}/${row.entityId ?? "null"}`);
    console.log(`    fieldPath: ${row.fieldPath ?? "null"}`);
    console.log(`    score: ${row.score}`);
    console.log(`    matchedOn: ${row.matchedOn.join(" | ")}`);
    console.log(`    summary: ${row.summary}`);
    console.log(`    safeUse: ${row.safeUse}`);
    console.log(`    mustNotDo: ${row.mustNotDo.join(" | ")}`);
  }

  console.log("Verdict:");
  console.log("  PASS - expected memories were retrieved and forbidden memories were ignored.");
}

async function assertPacketRetrieval(input: {
  packetId: string;
  expectedHitSeedIds: string[];
  expectedIgnoredSeedIds: string[];
}) {
  const claimState = await readJsonFile<unknown>(
    packetPath(input.packetId, "new-claim-state.json"),
  );

  const expected = await readJsonFile<ExpectedMemoryHits>(
    packetPath(input.packetId, "expected-memory-hits.json"),
  );

  assert.deepEqual(
    input.expectedHitSeedIds,
    expected.expectedHitMemorySeedIds,
    `Hard-coded expected hit seed IDs differ from fixture for ${input.packetId}`,
  );

  assert.deepEqual(
    input.expectedIgnoredSeedIds,
    expected.expectedIgnoredMemorySeedIds,
    `Hard-coded ignored seed IDs differ from fixture for ${input.packetId}`,
  );

  const result = await retrieveRelevantMemories({
    claimState,
    writeHits: false,
    limit: 5,
  });

  const debugRows = await getDebugRowsForRelevantMemories(result.memories);
  const retrievedSeedIds = debugRows.map((row) => row.seedId);

  for (const expectedHitSeedId of input.expectedHitSeedIds) {
    assert(
      retrievedSeedIds.includes(expectedHitSeedId),
      `${input.packetId} expected memory ${expectedHitSeedId}, got [${retrievedSeedIds.join(
        ", ",
      )}]`,
    );
  }

  for (const ignoredSeedId of input.expectedIgnoredSeedIds) {
    assert(
      !retrievedSeedIds.includes(ignoredSeedId),
      `${input.packetId} should ignore memory ${ignoredSeedId}, got [${retrievedSeedIds.join(
        ", ",
      )}]`,
    );
  }

  if (input.expectedHitSeedIds.length === 0) {
    assert.equal(
      result.memories.length,
      0,
      `${input.packetId} expected no relevant memories, got ${result.memories.length}`,
    );
  }

  printRetrievalBehavior({
    scenario: scenarioForPacket({
      packetId: input.packetId,
      claimState,
      expected,
    }),
    expectedHitSeedIds: input.expectedHitSeedIds,
    expectedIgnoredSeedIds: input.expectedIgnoredSeedIds,
    expectedUse: expected.expectedUse,
    mustNotUseFor: expected.mustNotUseFor,
    totalCandidates: result.totalCandidates,
    writtenHitCount: result.writtenHitCount,
    rows: debugRows,
  });
}

async function runGenericRequiredEvidenceCrossEntityRetrievalSmoke() {
  let memoryId: string | null = null;

  try {
    const memory = await prisma.workflowMemory.create({
      data: {
        kind: "PRIOR_REVIEW_DECISION",
        status: "ACTIVE",
        riskLevel: "MEDIUM",
        confidence: 0.72,

        entityType: "FIELD_PATH",
        entityId: "requiredEvidence.policeReport",
        fieldPath: "requiredEvidence.policeReport",

        summary:
          "Prior review required policeReport evidence before continuing similar third-party claims.",
        safeUse:
          "When current validation says policeReport is required, draft/request specific missing evidence. Do not assume it is missing without current validation.",
        mustNotDo: toPrismaJson([
          "do not apply this only because claimant name is similar",
          "do not reject the claim from memory",
          "do not mark policeReport missing unless current validation requires it",
        ]),
        tags: toPrismaJson([
          "required_evidence:police_report",
          "police_report_required",
          "third_party_claim",
          "review_decision",
        ]),
        evidenceJson: toPrismaJson({
          smokeTest: true,
          memorySeedId: "SMOKE-GENERIC-REQUIRED-EVIDENCE",
          reason:
            "Generic required-evidence memory should retrieve across different claimant/vendor.",
        }),
        confirmedCount: 0,
        contradictedCount: 0,
      },
    });

    memoryId = memory.id;

    const claimState = {
      runId: "SMOKE-RUN-GENERIC-REQUIRED-EVIDENCE",
      customerId: "CUST-W5-DIFFERENT-CLAIMANT",
      claimantId: "CUST-W5-DIFFERENT-CLAIMANT",
      vendorId: "VEND-W5-DIFFERENT-VENDOR",
      policyId: "POLICY-W5-DIFFERENT",

      extractedJson: {
        customerId: "CUST-W5-DIFFERENT-CLAIMANT",
        vendorId: "VEND-W5-DIFFERENT-VENDOR",
        policyId: "POLICY-W5-DIFFERENT",
        claimNumber: "CLM-GENERIC-RETRIEVAL",
        insuredName: "Rohan Verma",
        policyNumber: "POL-GENERIC-RETRIEVAL",
        lossType: "third_party",
        damageType: "bumper_damage",
      },

      validationJson: {
        isValid: false,
        missingFields: [],
        requiredEvidence: ["policeReport"],
        conflicts: [],
      },

      missingFields: [],
      requiredEvidence: ["policeReport"],

      runStatus: "NEEDS_REVIEW",
      reviewTaskStatus: null,
      retrievalStatus: null,
      policyDecision: null,
    };

    const result = await retrieveRelevantMemories({
      claimState,
      writeHits: false,
      limit: 5,
    });

    const retrievedMemory = result.memories.find(
      (item) => item.memoryId === memory.id,
    );

    assert(
      retrievedMemory,
      `Expected generic required-evidence memory ${memory.id} to be retrieved for different claimant/vendor.`,
    );

    const matchedTypes = retrievedMemory.matchedOn.map((item) => item.type);

    assert(
      matchedTypes.includes("SAME_FIELD") ||
        matchedTypes.includes("REQUIRED_EVIDENCE_MATCH"),
      `Expected SAME_FIELD or REQUIRED_EVIDENCE_MATCH, got [${matchedTypes.join(
        ", ",
      )}]`,
    );

    assert.equal(
      retrievedMemory.entityType,
      "FIELD_PATH",
      "Expected retrieved memory to be FIELD_PATH scoped.",
    );

    printRetrievalBehavior({
      scenario: {
        title:
          "4. Generic required-evidence retrieval: same evidence problem, different claimant/vendor",
        claimSummary: {
          customerId: claimState.customerId,
          vendorId: claimState.vendorId,
          policyId: claimState.policyId,
          claimNumber: claimState.extractedJson.claimNumber,
          insuredName: claimState.extractedJson.insuredName,
          lossType: claimState.extractedJson.lossType,
          missingFields: claimState.missingFields,
          requiredEvidence: claimState.requiredEvidence,
        },
        memoryRuleBeingTested:
          "A FIELD_PATH-scoped requiredEvidence.policeReport memory should retrieve across different claimant/vendor because it is a reusable workflow pattern.",
        expectedBehavior:
          "ClaimFlow should retrieve this memory and use it to draft/request specific missing evidence.",
        safetyRule:
          "This memory must not be used as claimant/vendor risk evidence and must not mark evidence missing unless current validation requires it.",
      },
      expectedHitSeedIds: ["SMOKE-GENERIC-REQUIRED-EVIDENCE"],
      expectedIgnoredSeedIds: [],
      expectedUse: "draft_or_request_required_evidence",
      mustNotUseFor: ["same_name_match", "claim_rejection", "policy_evidence"],
      totalCandidates: result.totalCandidates,
      writtenHitCount: result.writtenHitCount,
      rows: await getDebugRowsForRelevantMemories([retrievedMemory]),
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

async function runRealMemoryHitAuditSmoke() {
  let documentId: string | null = null;

  try {
    const document = await prisma.document.create({
      data: {
        filename: "week5-memory-retrieval-smoke.json",
        mimeType: "application/json",
        sizeBytes: 1,
        sourceType: "EMAIL_TEXT",
        contentText: "Week 5 memory retrieval smoke test",
      },
    });

    documentId = document.id;

    const run = await prisma.extractionRun.create({
      data: {
        documentId: document.id,
        status: "NEEDS_REVIEW",
        extractedJson: toPrismaJson({
          customerId: "CUST-W5-001",
          claimNumber: "CLM-W5-SMOKE",
          insuredName: "Dev Arora",
          policyNumber: null,
          lossType: "own_damage",
        }),
        validationJson: toPrismaJson({
          isValid: false,
          missingFields: ["policyNumber"],
          conflicts: [],
        }),
        missingFieldsJson: toPrismaJson(["policyNumber"]),
      },
    });

    const result = await retrieveRelevantMemories({
      runId: run.id,
      writeHits: true,
      limit: 5,
    });

    assert(
      result.memories.length > 0,
      "Real run audit smoke expected at least one relevant memory.",
    );

    assert(
      result.writtenHitCount > 0,
      "Real run audit smoke expected at least one MemoryHit row.",
    );

    const debugRows = await getDebugRowsForRelevantMemories(result.memories);

    const hit = await prisma.memoryHit.findFirst({
      where: {
        runId: run.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    assert(hit, "MemoryHit row not found for real run audit smoke.");

    const memory = await prisma.workflowMemory.findUnique({
      where: {
        id: hit.memoryId,
      },
    });

    assert(memory, `WorkflowMemory not found for hit ${hit.id}.`);
    assert(
      memory.lastUsedAt,
      `WorkflowMemory.lastUsedAt was not updated for ${memory.id}.`,
    );

    printRetrievalBehavior({
      scenario: {
        title:
          "5. Real run audit: retrieval writes MemoryHit rows and updates lastUsedAt",
        claimSummary: {
          runId: run.id,
          customerId: "CUST-W5-001",
          claimNumber: "CLM-W5-SMOKE",
          insuredName: "Dev Arora",
          policyNumber: null,
          missingFields: ["policyNumber"],
        },
        memoryRuleBeingTested:
          "When retrieval runs against a real ExtractionRun with writeHits=true, ClaimFlow should create MemoryHit audit rows.",
        expectedBehavior:
          "MemoryHit rows are written and WorkflowMemory.lastUsedAt is updated for retrieved memories.",
        safetyRule:
          "Audit hits only prove retrieval happened. They do not strengthen memory until later reviewer outcome confirms usefulness.",
      },
      expectedHitSeedIds: ["WMEM-SEED-W5-001"],
      expectedIgnoredSeedIds: [],
      expectedUse: "audit_retrieval_for_real_run",
      mustNotUseFor: ["confidence_update_without_review"],
      totalCandidates: result.totalCandidates,
      writtenHitCount: result.writtenHitCount,
      rows: debugRows,
    });
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

async function main() {
  console.log("Memory retrieval smoke test started");
  console.log("");

  const seedResult = await loadWeek5MemorySeed({
    log: false,
  });

  console.log("Seed load:");
  console.log(
    JSON.stringify(
      {
        total: seedResult.total,
        created: seedResult.created,
        skipped: seedResult.skipped,
        note:
          "created=0 and skipped=7 is expected when the seed was already loaded.",
      },
      null,
      2,
    ),
  );

  await assertPacketRetrieval({
    packetId: "w5-001-prior-policy-number-correction",
    expectedHitSeedIds: ["WMEM-SEED-W5-001"],
    expectedIgnoredSeedIds: ["WMEM-SEED-W5-002", "WMEM-SEED-W5-005"],
  });

  await assertPacketRetrieval({
    packetId: "w5-002-prior-rejection-route-review",
    expectedHitSeedIds: ["WMEM-SEED-W5-002"],
    expectedIgnoredSeedIds: ["WMEM-SEED-W5-001", "WMEM-SEED-W5-005"],
  });

  await assertPacketRetrieval({
    packetId: "w5-003-irrelevant-same-name-ignore",
    expectedHitSeedIds: [],
    expectedIgnoredSeedIds: [
      "WMEM-SEED-W5-001",
      "WMEM-SEED-W5-002",
      "WMEM-SEED-W5-005",
    ],
  });

  await runGenericRequiredEvidenceCrossEntityRetrievalSmoke();
  await runRealMemoryHitAuditSmoke();

  console.log("");
  console.log("Memory retrieval smoke test passed");
  console.log(
    JSON.stringify(
      {
        priorCorrection:
          "Same claimant + same field issue retrieves HUMAN_CORRECTION memory for reviewer verification.",
        priorRejection:
          "Same claimant retrieves PRIOR_REJECTION memory only as human-review routing context.",
        sameNameIgnored:
          "Different stable entity does not retrieve claimant-scoped memory, even if names look similar.",
        genericRequiredEvidence:
          "FIELD_PATH required-evidence memory can retrieve across different claimant/vendor.",
        realAudit:
          "Real run retrieval writes MemoryHit rows and updates lastUsedAt, but does not change confidence.",
      },
      null,
      2,
    ),
  );
}

if (import.meta.main) {
  main()
    .catch((error) => {
      console.error("Memory retrieval smoke test failed");
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
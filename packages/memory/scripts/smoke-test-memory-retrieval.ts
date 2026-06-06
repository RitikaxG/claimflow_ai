import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { prisma } from "@repo/db";
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

type RelevantMemoryDebugRow = {
  seedId: string;
  memoryId: string;
  score: number;
  kind: string;
  riskLevel: string;
  status: string;
  matchedOn: string;
  retrievalReason: string;
  summary: string;
  safeUse: string;
  mustNotDo: string;
};

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf-8");

  return JSON.parse(raw) as T;
}

function packetPath(packetId: string, filename: string): string {
  return path.join(WEEK5_MEMORY_ROOT, "packets", packetId, filename);
}

function getMemorySeedId(evidenceJson: unknown): string | null {
  if (!isRecord(evidenceJson)) {
    return null;
  }

  const memorySeedId = evidenceJson.memorySeedId;

  return typeof memorySeedId === "string" ? memorySeedId : null;
}

function formatMatchedOn(memory: RelevantMemory): string {
  if (memory.matchedOn.length === 0) {
    return "none";
  }

  return memory.matchedOn
    .map((signal) => `${signal.type}(+${signal.points}: ${signal.value})`)
    .join(", ");
}

function formatMustNotDo(memory: RelevantMemory): string {
  if (memory.mustNotDo.length === 0) {
    return "none";
  }

  return memory.mustNotDo.join("; ");
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
      matchedOn: formatMatchedOn(memory),
      retrievalReason: memory.retrievalReason,
      summary: memory.summary,
      safeUse: memory.safeUse,
      mustNotDo: formatMustNotDo(memory),
    };
  });
}

function printRetrievalDebug(input: {
  packetId: string;
  expectedUse: string;
  mustNotUseFor: string[];
  totalCandidates: number;
  writtenHitCount: number;
  rows: RelevantMemoryDebugRow[];
}) {
  console.log(`Packet retrieval passed: ${input.packetId}`);
  console.log(`expectedUse: ${input.expectedUse}`);
  console.log(`mustNotUseFor: ${input.mustNotUseFor.join(", ")}`);
  console.log(`totalCandidates: ${input.totalCandidates}`);
  console.log(`writtenHitCount: ${input.writtenHitCount}`);

  if (input.rows.length === 0) {
    console.log("retrievedMemories: none");
    console.log("");
    return;
  }

  console.log("retrievedMemories:");

  for (const [index, row] of input.rows.entries()) {
    console.log(`  #${index + 1}`);
    console.log(`    seedId: ${row.seedId}`);
    console.log(`    memoryId: ${row.memoryId}`);
    console.log(`    score: ${row.score}`);
    console.log(`    kind: ${row.kind}`);
    console.log(`    riskLevel: ${row.riskLevel}`);
    console.log(`    status: ${row.status}`);
    console.log(`    matchedOn: ${row.matchedOn}`);
    console.log(`    retrievalReason: ${row.retrievalReason}`);
    console.log(`    summary: ${row.summary}`);
    console.log(`    safeUse: ${row.safeUse}`);
    console.log(`    mustNotDo: ${row.mustNotDo}`);
  }

  console.log("");
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

  printRetrievalDebug({
    packetId: input.packetId,
    expectedUse: expected.expectedUse,
    mustNotUseFor: expected.mustNotUseFor,
    totalCandidates: result.totalCandidates,
    writtenHitCount: result.writtenHitCount,
    rows: debugRows,
  });
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
        extractedJson: {
          customerId: "CUST-W5-001",
          claimNumber: "CLM-W5-SMOKE",
          insuredName: "Dev Arora",
          policyNumber: null,
          lossType: "own_damage",
        },
        validationJson: {
          isValid: false,
          missingFields: ["policyNumber"],
          conflicts: [],
        },
        missingFieldsJson: ["policyNumber"],
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

    console.log("Real MemoryHit audit smoke passed");
    console.log(`runId: ${run.id}`);
    console.log(`memoryHitId: ${hit.id}`);
    console.log(`writtenHitCount: ${result.writtenHitCount}`);
    console.log("retrievedMemories:");

    for (const [index, row] of debugRows.entries()) {
      console.log(`  #${index + 1}`);
      console.log(`    seedId: ${row.seedId}`);
      console.log(`    score: ${row.score}`);
      console.log(`    kind: ${row.kind}`);
      console.log(`    matchedOn: ${row.matchedOn}`);
      console.log(`    summary: ${row.summary}`);
    }

    console.log("");
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
  console.log(`total: ${seedResult.total}`);
  console.log(`created: ${seedResult.created}`);
  console.log(`skipped: ${seedResult.skipped}`);
  console.log("");

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

  await runRealMemoryHitAuditSmoke();

  console.log("Memory retrieval smoke test passed");
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
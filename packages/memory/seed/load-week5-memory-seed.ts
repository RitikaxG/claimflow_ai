import { readFile } from "node:fs/promises";
import { prisma } from "@repo/db";
import { z } from "zod";
import {
  type WorkflowMemorySeed,
  WorkflowMemorySeedSchema,
} from "../types";
import { WEEK5_MEMORY_SEED_PATH } from "../utils/paths";

export type LoadWeek5MemorySeedResult = {
  total: number;
  created: number;
  skipped: number;
  memoryIds: string[];
};

const WorkflowMemorySeedArraySchema = z.array(WorkflowMemorySeedSchema);

async function readSeedFile(): Promise<WorkflowMemorySeed[]> {
  const raw = await readFile(WEEK5_MEMORY_SEED_PATH, "utf-8");
  const parsed = JSON.parse(raw);

  return WorkflowMemorySeedArraySchema.parse(parsed);
}

async function loadOneSeedMemory(seed: WorkflowMemorySeed): Promise<{
  memoryId: string;
  created: boolean;
}> {
  return prisma.$transaction(async (tx) => {
    const existingMemory = await tx.workflowMemory.findFirst({
      where: {
        kind: seed.kind,
        entityType: seed.entityType ?? null,
        entityId: seed.entityId ?? null,
        fieldPath: seed.fieldPath ?? null,
        summary: seed.summary,
      },
    });

    if (existingMemory) {
      return {
        memoryId: existingMemory.id,
        created: false,
      };
    }

    const memory = await tx.workflowMemory.create({
      data: {
        kind: seed.kind,
        status: seed.status,
        riskLevel: seed.riskLevel,
        confidence: seed.confidence,
        summary: seed.summary,
        safeUse: seed.safeUse,
        mustNotDo: seed.mustNotDo,
        entityType: seed.entityType ?? null,
        entityId: seed.entityId ?? null,
        fieldPath: seed.fieldPath ?? null,
        tags: seed.tags,
        evidenceJson: {
          ...(seed.evidenceJson ?? {}),
          memorySeedId: seed.memorySeedId,
        },
        sourceRunId: seed.sourceRunId ?? null,
        sourceReviewDecisionId: seed.sourceReviewDecisionId ?? null,
        confirmedCount: seed.confirmedCount,
        contradictedCount: seed.contradictedCount,
      },
    });

    await tx.memoryUpdate.create({
      data: {
        memoryId: memory.id,
        updateType: "CREATED",
        afterStatus: memory.status,
        confidenceDelta: memory.confidence,
        note: `Created from Week 5 seed ${seed.memorySeedId}`,
        metadata: {
          memorySeedId: seed.memorySeedId,
          source: "workflow-memories.seed.json",
        },
      },
    });

    return {
      memoryId: memory.id,
      created: true,
    };
  });
}

export async function loadWeek5MemorySeed(options: {
  log?: boolean;
} = {}): Promise<LoadWeek5MemorySeedResult> {
  const seeds = await readSeedFile();

  let created = 0;
  let skipped = 0;
  const memoryIds: string[] = [];

  if (options.log) {
    console.log("Week 5 memory seed load started");
    console.log(`seedPath: ${WEEK5_MEMORY_SEED_PATH}`);
    console.log(`total: ${seeds.length}`);
    console.log("");
  }

  for (const seed of seeds) {
    const result = await loadOneSeedMemory(seed);

    memoryIds.push(result.memoryId);

    if (result.created) {
      created += 1;
    } else {
      skipped += 1;
    }

    if (options.log) {
      console.log(
        `${result.created ? "Created" : "Skipped"} memory seed: ${
          seed.memorySeedId
        }`,
      );
      console.log(`kind: ${seed.kind}`);
      console.log(`entity: ${seed.entityType ?? "null"}/${seed.entityId ?? "null"}`);
      console.log(`fieldPath: ${seed.fieldPath ?? "null"}`);
      console.log("");
    }
  }

  const summary = {
    total: seeds.length,
    created,
    skipped,
    memoryIds,
  };

  if (options.log) {
    console.log("Week 5 memory seed load complete");
    console.log(`total: ${summary.total}`);
    console.log(`created: ${summary.created}`);
    console.log(`skipped: ${summary.skipped}`);
  }

  return summary;
}

async function main() {
  await loadWeek5MemorySeed({
    log: true,
  });
}

if (import.meta.main) {
  main()
    .catch((error) => {
      console.error("Failed to load Week 5 memory seed.");
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
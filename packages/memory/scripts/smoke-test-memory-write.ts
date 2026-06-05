import { readFile } from "node:fs/promises";
import { prisma } from "@repo/db";
import { z } from "zod";
import { loadWeek5MemorySeed } from "../seed/load-week5-memory-seed";
import { createMemoryFromObservation } from "../write/create-memory-from-observation";
import { MemoryObservationSchema } from "../types";
import { WEEK5_MEMORY_OBSERVATIONS_PATH } from "../utils/paths";

const MemoryObservationArraySchema = z.array(MemoryObservationSchema);

async function readMemoryObservations() {
  const raw = await readFile(WEEK5_MEMORY_OBSERVATIONS_PATH, "utf-8");
  const parsed = JSON.parse(raw);

  return MemoryObservationArraySchema.parse(parsed);
}

async function main() {
  console.log("Memory write smoke test started");
  console.log("");

  const seedResult = await loadWeek5MemorySeed({
    log: false,
  });

  console.log("Seed load:");
  console.log(`total: ${seedResult.total}`);
  console.log(`created: ${seedResult.created}`);
  console.log(`skipped: ${seedResult.skipped}`);
  console.log("");

  const observations = await readMemoryObservations();

  const observation = observations.find(
    (item) => item.observationId === "OBS-W5-001",
  );

  if (!observation) {
    throw new Error("OBS-W5-001 not found in memory-observations.json");
  }

  const writeResult = await createMemoryFromObservation(observation);

  if (!writeResult.memoryId) {
    throw new Error(
      `OBS-W5-001 did not produce a memory. Reason: ${writeResult.reason}`,
    );
  }

  const memory = await prisma.workflowMemory.findUnique({
    where: {
      id: writeResult.memoryId,
    },
  });

  if (!memory) {
    throw new Error(`Created memory not found: ${writeResult.memoryId}`);
  }

  const createdUpdate = await prisma.memoryUpdate.findFirst({
    where: {
      memoryId: memory.id,
      updateType: "CREATED",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!createdUpdate) {
    throw new Error(`MemoryUpdate CREATED row not found for ${memory.id}`);
  }

  console.log("Observation write:");
  console.log(`observationId: ${observation.observationId}`);
  console.log(`memoryId: ${memory.id}`);
  console.log(`kind: ${memory.kind}`);
  console.log(`entity: ${memory.entityType ?? "null"}/${memory.entityId ?? "null"}`);
  console.log(`fieldPath: ${memory.fieldPath ?? "null"}`);
  console.log(`result: ${writeResult.reason}`);
  console.log("");

  console.log("Audit:");
  console.log("MemoryUpdate CREATED found: yes");
  console.log("");

  console.log("Memory write smoke test passed");
}

if (import.meta.main) {
  main()
    .catch((error) => {
      console.error("Memory write smoke test failed");
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
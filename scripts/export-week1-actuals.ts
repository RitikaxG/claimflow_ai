import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type EvalManifestItem = {
  sampleName: string;
  documentFilename?: string;
  runId?: string;
};

const BASE_DIR =
  process.env.EVAL_BASE_DIR ?? "sample-data/auto-insurance/v1";

const MANIFEST_PATH = path.join(BASE_DIR, "eval-manifest.json");
const ACTUAL_EXTRACTIONS_DIR = path.join(BASE_DIR, "actual-extractions");
const ACTUAL_VALIDATIONS_DIR = path.join(BASE_DIR, "actual-validations");

const ENV_FILES = [".env", "apps/web/.env.local"];

async function loadEnvFiles() {
  for (const envFile of ENV_FILES) {
    if (!existsSync(envFile)) {
      continue;
    }

    const content = await readFile(envFile, "utf-8");

    for (const line of content.split("\n")) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();

      if (!key || process.env[key]) {
        continue;
      }

      process.env[key] = rawValue.replace(/^["']|["']$/g, "");
    }
  }
}

async function readManifest(): Promise<EvalManifestItem[]> {
  const raw = await readFile(MANIFEST_PATH, "utf-8");
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("eval-manifest.json must contain an array.");
  }

  return parsed.map((item) => {
    if (!item || typeof item !== "object") {
      throw new Error("Each manifest item must be an object.");
    }

    const record = item as Record<string, unknown>;

    if (typeof record.sampleName !== "string") {
      throw new Error("Each manifest item needs sampleName.");
    }

    if (
      record.documentFilename !== undefined &&
      typeof record.documentFilename !== "string"
    ) {
      throw new Error("documentFilename must be a string.");
    }

    if (record.runId !== undefined && typeof record.runId !== "string") {
      throw new Error("runId must be a string.");
    }

    if (!record.documentFilename && !record.runId) {
      throw new Error(
        `${record.sampleName} needs either documentFilename or runId.`,
      );
    }

    return {
      sampleName: record.sampleName,
      documentFilename: record.documentFilename,
      runId: record.runId,
    };
  });
}

function toPrettyJson(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function main() {
  await loadEnvFiles();

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is missing. Add it to .env or apps/web/.env.local.",
    );
  }

  const { prisma } = await import("@repo/db");

  await mkdir(ACTUAL_EXTRACTIONS_DIR, { recursive: true });
  await mkdir(ACTUAL_VALIDATIONS_DIR, { recursive: true });

  const manifest = await readManifest();

  for (const item of manifest) {
    const run = item.runId
      ? await prisma.extractionRun.findUnique({
          where: {
            id: item.runId,
          },
          include: {
            document: true,
          },
        })
      : await prisma.extractionRun.findFirst({
          where: {
            document: {
              filename: item.documentFilename,
              deletedAt: null,
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
          include: {
            document: true,
          },
        });

    if (!run) {
      throw new Error(
        `No run found for ${item.sampleName}. Check eval-manifest.json.`,
      );
    }

    if (!run.extractedJson) {
      throw new Error(
        `${item.sampleName} has no extractedJson. Run extraction first.`,
      );
    }

    if (!run.validationJson) {
      throw new Error(
        `${item.sampleName} has no validationJson. Run validation first.`,
      );
    }

    await writeFile(
      path.join(ACTUAL_EXTRACTIONS_DIR, `${item.sampleName}.json`),
      toPrettyJson(run.extractedJson),
    );

    await writeFile(
      path.join(ACTUAL_VALIDATIONS_DIR, `${item.sampleName}.json`),
      toPrettyJson(run.validationJson),
    );

    console.log(
      `✅ Exported ${item.sampleName} from run ${run.id} (${run.document.filename})`,
    );
  }

  await prisma.$disconnect();

  console.log("");
  console.log("✅ Week 1 actual outputs exported.");
  console.log(`Extractions: ${ACTUAL_EXTRACTIONS_DIR}`);
  console.log(`Validations: ${ACTUAL_VALIDATIONS_DIR}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`❌ Export failed: ${message}`);
  process.exitCode = 1;
});
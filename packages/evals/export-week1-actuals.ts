import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "@repo/db";

type EvalManifestItem = {
  sampleName: string;
  documentFilename?: string;
  runId?: string;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE_DIR = process.env.EVAL_BASE_DIR
  ? path.resolve(process.env.EVAL_BASE_DIR)
  : path.resolve(__dirname, "../../sample-data/auto-insurance/v1");

const MANIFEST_PATH = path.join(BASE_DIR, "eval-manifest.json");
const ACTUAL_EXTRACTIONS_DIR = path.join(BASE_DIR, "actual-extractions");
const ACTUAL_VALIDATIONS_DIR = path.join(BASE_DIR, "actual-validations");

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

async function findRun(item: EvalManifestItem) {
  if (item.runId) {
    return prisma.extractionRun.findUnique({
      where: {
        id: item.runId,
      },
      include: {
        document: true,
      },
    });
  }

  if (!item.documentFilename) {
    throw new Error(`${item.sampleName} is missing documentFilename.`);
  }

  const candidateRuns = await prisma.extractionRun.findMany({
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

  return (
    candidateRuns.find(
      (run) => run.extractedJson !== null && run.validationJson !== null,
    ) ?? null
  );
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is missing. Expected it in packages/db/.env via --env-file ../db/.env.",
    );
  }

  await mkdir(ACTUAL_EXTRACTIONS_DIR, { recursive: true });
  await mkdir(ACTUAL_VALIDATIONS_DIR, { recursive: true });

  const manifest = await readManifest();

  for (const item of manifest) {
    const run = await findRun(item);

    if (!run) {
        throw new Error(
            `No completed validated run found for ${item.sampleName}. ` +
            `Checked documentFilename="${item.documentFilename}". ` +
            `Make sure this document has been extracted and validated.`,
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

main().catch(async (error: unknown) => {
  await prisma.$disconnect().catch(() => undefined);

  const message = error instanceof Error ? error.message : String(error);
  console.error(`❌ Export failed: ${message}`);
  process.exitCode = 1;
});
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { ClaimExtractionSchema } from "@repo/shared/schemas";
import type { ClaimExtractionResult } from "@repo/ai";

type MockBehavior = "RETURN_GOLD_EXTRACTION" | "THROW_EXTRACTION_ERROR";

type MockManifest = {
  packetId: string;
  sourceType: "EMAIL_TEXT" | "PDF";
  documentPath: string;
  mockBehavior: MockBehavior;
};

type MockDocument = {
  filename: string;
  sourceType: "EMAIL_TEXT" | "PDF" | "IMAGE";
  contentText: string | null;
};

function getRepoRoot() {
  return process.cwd().endsWith("apps/web")
    ? path.resolve(process.cwd(), "../..")
    : process.cwd();
}

function getDatasetRoot() {
  return path.resolve(
    getRepoRoot(),
    process.env.MOCK_DATASET_ROOT ??
      "sample-data/week-02-review-failures/packets",
  );
}

function extractPacketIdFromContent(contentText: string | null) {
  if (!contentText) return null;

  const match = contentText.match(/CLAIMFLOW_PACKET_ID:\s*(w2-[a-z0-9-]+)/i);
  return match?.[1] ?? null;
}

function parseManifest(raw: unknown, manifestPath: string): MockManifest {
  if (!raw || typeof raw !== "object") {
    throw new Error(`Invalid mock manifest at ${manifestPath}`);
  }

  const record = raw as Record<string, unknown>;

  if (typeof record.packetId !== "string") {
    throw new Error(`Mock manifest missing packetId at ${manifestPath}`);
  }

  if (record.sourceType !== "EMAIL_TEXT" && record.sourceType !== "PDF") {
    throw new Error(`Mock manifest has invalid sourceType at ${manifestPath}`);
  }

  if (typeof record.documentPath !== "string") {
    throw new Error(`Mock manifest missing documentPath at ${manifestPath}`);
  }

  if (
    record.mockBehavior !== "RETURN_GOLD_EXTRACTION" &&
    record.mockBehavior !== "THROW_EXTRACTION_ERROR"
  ) {
    throw new Error(
      `Unsupported mockBehavior ${String(record.mockBehavior)} for packet ${record.packetId}`,
    );
  }

  return {
    packetId: record.packetId,
    sourceType: record.sourceType,
    documentPath: record.documentPath,
    mockBehavior: record.mockBehavior,
  };
}

async function readManifest(packetDir: string) {
  const manifestPath = path.join(packetDir, "manifest.json");
  const raw = JSON.parse(await readFile(manifestPath, "utf-8")) as unknown;

  return parseManifest(raw, manifestPath);
}

async function findPacketForDocument(document: MockDocument) {
  const datasetRoot = getDatasetRoot();
  const packetIdFromContent = extractPacketIdFromContent(document.contentText);

  const entries = await readdir(datasetRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const packetDir = path.join(datasetRoot, entry.name);
    const manifest = await readManifest(packetDir);

    if (packetIdFromContent && manifest.packetId === packetIdFromContent) {
      return { packetDir, manifest };
    }

    const expectedFilename = path.basename(manifest.documentPath);

    if (
      document.sourceType === "PDF" &&
      manifest.sourceType === "PDF" &&
      document.filename === expectedFilename
    ) {
      return { packetDir, manifest };
    }
  }

  return null;
}

export async function maybeLoadMockExtractionResult(
  document: MockDocument,
): Promise<ClaimExtractionResult | null> {
  if (process.env.USE_MOCK_EXTRACTION !== "true") {
    return null;
  }

  const packet = await findPacketForDocument(document);

  if (!packet) {
    return null;
  }

  const { packetDir, manifest } = packet;

  if (manifest.mockBehavior === "THROW_EXTRACTION_ERROR") {
    throw new Error(
      `Mock extraction failed: unreadable document for packet ${manifest.packetId}`,
    );
  }

  const goldPath = path.join(packetDir, "gold/extraction.gold.json");
  const goldRaw = JSON.parse(await readFile(goldPath, "utf-8")) as unknown;

  const extractedJson = ClaimExtractionSchema.parse(goldRaw);

  return {
    model: "mock-extractor-v1",
    promptVersion: "mock-week-2-review-failures",
    rawModelOutput: {
      source: "week-02-review-failures",
      packetId: manifest.packetId,
      mockBehavior: manifest.mockBehavior,
      goldPath: path.relative(getRepoRoot(), goldPath),
    },
    extractedJson,
    confidenceJson: {
      overallConfidence: extractedJson.overallConfidence,
    },
  };
}
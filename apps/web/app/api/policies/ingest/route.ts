import { embedMissingPolicyChunks, loadPolicyDocuments } from "@repo/rag";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type PolicyIngestRequestBody = {
  forceReload?: unknown;
  embed?: unknown;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readOptionalJsonBody(req: Request): Promise<PolicyIngestRequestBody> {
  try {
    const body = (await req.json()) as unknown;

    if (!isPlainObject(body)) {
      return {};
    }

    return body as PolicyIngestRequestBody;
  } catch {
    return {};
  }
}

function validatePolicyIngestBody(body: PolicyIngestRequestBody): {
  forceReload: boolean;
  embed: boolean;
} {
  if (body.forceReload !== undefined && typeof body.forceReload !== "boolean") {
    throw new Error("forceReload must be a boolean.");
  }

  if (body.embed !== undefined && typeof body.embed !== "boolean") {
    throw new Error("embed must be a boolean.");
  }

  return {
    forceReload: body.forceReload ?? false,
    embed: body.embed ?? true,
  };
}

export async function POST(req: Request) {
  try {
    const body = await readOptionalJsonBody(req);
    const input = validatePolicyIngestBody(body);

    const loadResult = await loadPolicyDocuments({
      forceReload: input.forceReload,
      log: false,
    });

    const embeddingResult = input.embed
      ? await embedMissingPolicyChunks({ log: false })
      : null;

    return NextResponse.json(
      {
        message: "Policy ingestion completed.",
        forceReload: input.forceReload,
        embed: input.embed,
        loading: loadResult,
        embedding: embeddingResult,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Policy ingestion API failed.", error);

    const message =
      error instanceof Error ? error.message : "Failed to ingest policy documents.";

    const isValidationError =
      message.includes("forceReload") || message.includes("embed");

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: isValidationError ? 400 : 500,
      },
    );
  }
}
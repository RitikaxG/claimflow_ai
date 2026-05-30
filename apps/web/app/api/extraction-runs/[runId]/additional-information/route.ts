import { prisma } from "@repo/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    runId: string;
  }>;
};

type EvidenceItemInput = {
  label: string;
  note?: string;
};

type FieldValueInput = {
  field: string;
  label?: string;
  value: string;
  note?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseEvidenceItems(value: unknown): EvidenceItemInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): EvidenceItemInput | null => {
      if (!isRecord(item)) {
        return null;
      }

      const label = typeof item.label === "string" ? item.label.trim() : "";
      const note = typeof item.note === "string" ? item.note.trim() : "";

      if (!label) {
        return null;
      }

      return note ? { label, note } : { label };
    })
    .filter((item): item is EvidenceItemInput => item !== null);
}

function parseFieldValues(value: unknown): FieldValueInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): FieldValueInput | null => {
      if (!isRecord(item)) {
        return null;
      }

      const field = typeof item.field === "string" ? item.field.trim() : "";
      const label = typeof item.label === "string" ? item.label.trim() : "";
      const fieldValue = typeof item.value === "string" ? item.value.trim() : "";
      const note = typeof item.note === "string" ? item.note.trim() : "";

      if (!field || !fieldValue) {
        return null;
      }

      return {
        field,
        value: fieldValue,
        ...(label ? { label } : {}),
        ...(note ? { note } : {}),
      };
    })
    .filter((item): item is FieldValueInput => item !== null);
}

export async function POST(request: Request, { params }: Params) {
  const { runId } = await params;
  const body = await request.json().catch(() => null);

  if (!isRecord(body)) {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const evidenceItems = parseEvidenceItems(body.evidenceItems);
  const fieldValues = parseFieldValues(body.fieldValues);

  if (evidenceItems.length === 0 && fieldValues.length === 0) {
    return NextResponse.json(
      {
        error:
          "At least one evidence item or field value is required.",
      },
      { status: 400 },
    );
  }

  const run = await prisma.extractionRun.findUnique({
    where: {
      id: runId,
    },
    select: {
      id: true,
    },
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const event = await tx.extractionEvent.create({
        data: {
        runId,
        type: "ADDITIONAL_INFORMATION_RECEIVED",
        message: [
            evidenceItems.length > 0
            ? `Evidence received: ${evidenceItems
                .map((item) => item.label)
                .join(", ")}`
            : null,
            fieldValues.length > 0
            ? `Field values received: ${fieldValues
                .map((item) => item.field)
                .join(", ")}`
            : null,
        ]
            .filter(Boolean)
            .join(" | "),
        metadata: {
            evidenceItems,
            fieldValues,
        },
        },
    });

    const updatedDraft = await tx.followupDraft.updateMany({
        where: {
        runId,
        status: "DRAFTED",
        },
        data: {
        status: "INFO_RECEIVED",
        },
    });

    return {
        event,
        updatedDraftCount: updatedDraft.count,
    };
    });

    return NextResponse.json(result);
}
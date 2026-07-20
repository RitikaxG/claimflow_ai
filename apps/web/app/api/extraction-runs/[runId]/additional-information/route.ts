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

type ConsistencyCheck = {
  field: string;
  submittedValue: string;
  evidenceLabels: string[];
  status: "MATCHED" | "REVIEW_REQUIRED";
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
      const fieldValue =
        typeof item.value === "string" ? item.value.trim() : "";
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

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeIdentifier(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function evidenceContainsIdentifier(note: string, identifier: string): boolean {
  const normalizedIdentifier = normalizeIdentifier(identifier);
  const candidates = note.match(/[a-z0-9][a-z0-9/_-]{3,}/gi) ?? [];

  return candidates.some(
    (candidate) => normalizeIdentifier(candidate) === normalizedIdentifier,
  );
}

function isFirField(value: string): boolean {
  const normalized = normalizeKey(value);
  return normalized === "firnumber" || normalized === "policefirnumber";
}

function isFirReferenceEvidence(value: string): boolean {
  const normalized = normalizeKey(value);
  return normalized.includes("fir");
}

function attachFirReference(note: string | undefined, firNumber: string) {
  const trimmedNote = note?.trim() ?? "";

  if (evidenceContainsIdentifier(trimmedNote, firNumber)) {
    return trimmedNote;
  }

  const firReference = `FIR number: ${firNumber}`;
  return trimmedNote ? `${firReference}\n${trimmedNote}` : firReference;
}

function linkFirToReceivedEvidence(
  evidenceItems: EvidenceItemInput[],
  fieldValues: FieldValueInput[],
) {
  const firField = fieldValues.find((item) => isFirField(item.field));

  if (!firField) {
    return evidenceItems;
  }

  return evidenceItems.map((item) =>
    isFirReferenceEvidence(item.label)
      ? {
          ...item,
          note: attachFirReference(item.note, firField.value),
        }
      : item,
  );
}

export function validateReceivedInformationConsistency(input: {
  evidenceItems: EvidenceItemInput[];
  fieldValues: FieldValueInput[];
}): { checks: ConsistencyCheck[]; error: string | null } {
  const firField = input.fieldValues.find((item) => isFirField(item.field));

  if (!firField) {
    return { checks: [], error: null };
  }

  const firEvidence = input.evidenceItems.filter((item) =>
    isFirReferenceEvidence(item.label),
  );

  if (firEvidence.length === 0) {
    return {
      checks: [
        {
          field: firField.field,
          submittedValue: firField.value,
          evidenceLabels: [],
          status: "REVIEW_REQUIRED",
        },
      ],
      error: null,
    };
  }

  const matchesEvidenceDetails = firEvidence.some((item) => {
    return evidenceContainsIdentifier(item.note ?? "", firField.value);
  });

  return {
    checks: [
      {
        field: firField.field,
        submittedValue: firField.value,
        evidenceLabels: firEvidence.map((item) => item.label),
        status: matchesEvidenceDetails ? "MATCHED" : "REVIEW_REQUIRED",
      },
    ],
    error: null,
  };
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

  const fieldValues = parseFieldValues(body.fieldValues);
  const evidenceItems = linkFirToReceivedEvidence(
    parseEvidenceItems(body.evidenceItems),
    fieldValues,
  );

  if (evidenceItems.length === 0 && fieldValues.length === 0) {
    return NextResponse.json(
      {
        error: "At least one evidence item or field value is required.",
      },
      { status: 400 },
    );
  }

  const consistency = validateReceivedInformationConsistency({
    evidenceItems,
    fieldValues,
  });

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
          consistencyChecks: consistency.checks,
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

import { prisma } from "@repo/db";
import { tool } from "langchain";
import { z } from "zod";
import { toPrismaJson } from "./prisma-json";
import { failedToolResult, getErrorMessage, okToolResult } from "./tool-result";
import {
  inferRequestType,
  uniqueStrings,
} from "./information-request-metadata";

const FieldRequestSchema = z.object({
  field: z.string().min(1),
  label: z.string().min(1),
  question: z.string().min(5),
  acceptedEvidence: z.array(z.string().min(1)).default([]),
  valueKind: z
    .enum(["text", "date", "identifier", "money", "unknown"])
    .default("unknown"),
});

const MemoryGuidanceItemSchema = z.object({
  memoryId: z.string().min(1),
  memoryHitId: z.string().nullable().optional(),
  kind: z.string().min(1),
  riskLevel: z.string().min(1),
  confidence: z.number(),
  score: z.number(),
  summary: z.string().min(1),
  safeUse: z.string().min(1),
  mustNotDo: z.array(z.string()).default([]),
  matchedOn: z.array(z.unknown()).default([]),
});

const MemoryGuidanceSchema = z.object({
  memoryHitIds: z.array(z.string().min(1)).default([]),
  items: z.array(MemoryGuidanceItemSchema).default([]),
  reviewerNote: z.string().min(1),
  mustNotDo: z.array(z.string()).default([]),
});

const DraftInformationRequestInputSchema = z
  .object({
    runId: z.string().min(1),
    requestedEvidence: z.array(z.string().min(1)).default([]),
    requestedFields: z.array(z.string().min(1)).default([]),
    fieldRequests: z.array(FieldRequestSchema).default([]),
    claimNumber: z.string().nullable().optional(),
    recipientLabel: z.string().nullable().optional(),
    memoryGuidance: MemoryGuidanceSchema.nullable().optional(),
  })
  .refine(
    (value) =>
      value.requestedEvidence.length > 0 || value.requestedFields.length > 0,
    {
      message: "At least one requested evidence item or field is required.",
    },
  );

function buildSubject(input: {
  claimNumber?: string | null;
  requestedFields: string[];
  requestedEvidence: string[];
}) {
  const claimSuffix =
    input.claimNumber && input.claimNumber.trim().length > 0
      ? ` for claim ${input.claimNumber.trim()}`
      : "";

  if (input.requestedFields.length > 0 && input.requestedEvidence.length > 0) {
    return `Additional information and documents required${claimSuffix}`;
  }

  if (input.requestedFields.length > 0) {
    return `Additional claim information required${claimSuffix}`;
  }

  return `Additional documents required${claimSuffix}`;
}

function buildBody(input: {
  requestedEvidence: string[];
  requestedFields: string[];
  fieldRequests: Array<z.infer<typeof FieldRequestSchema>>;
  claimNumber?: string | null;
  recipientLabel?: string | null;
}) {
  const recipient = input.recipientLabel?.trim() || "Customer";

  const claimLine =
    input.claimNumber && input.claimNumber.trim().length > 0
      ? ` for claim ${input.claimNumber.trim()}`
      : "";

  const lines = [
    `Hi ${recipient},`,
    "",
    `We need the following additional information/documents to continue reviewing your claim${claimLine}:`,
    "",
  ];

  if (input.fieldRequests.length > 0) {
    lines.push("Missing information:");

    input.fieldRequests.forEach((item, index) => {
      const evidenceText =
        item.acceptedEvidence.length > 0
          ? ` Accepted supporting document(s): ${item.acceptedEvidence.join(", ")}.`
          : "";

      lines.push(`${index + 1}. ${item.label} — ${item.question}${evidenceText}`);
    });

    lines.push("");
  }

  if (input.requestedEvidence.length > 0) {
    lines.push("Missing document(s):");

    input.requestedEvidence.forEach((item, index) => {
      lines.push(`${index + 1}. ${item}`);
    });

    lines.push("");
  }

  lines.push(
    "Please provide the requested information or upload the supporting document(s) so the review can be reopened.",
    "",
    "This is a draft request and has not been sent automatically.",
  );

  return lines.join("\n");
}

function jsonStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
}

function sameStringSet(left: string[], right: string[]) {
  const normalize = (values: string[]) =>
    [...new Set(values.map((value) => value.trim().toLowerCase()))].sort();

  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}

export const draftInformationRequestTool = tool(
  async ({
    runId,
    requestedEvidence,
    requestedFields,
    fieldRequests,
    claimNumber,
    recipientLabel,
    memoryGuidance,
  }) => {
    try {
      const cleanEvidence = uniqueStrings(requestedEvidence);
      const cleanFields = uniqueStrings(requestedFields);

      const requestType = inferRequestType({
        requestedEvidence: cleanEvidence,
        requestedFields: cleanFields,
      });

      const subject = buildSubject({
        claimNumber,
        requestedEvidence: cleanEvidence,
        requestedFields: cleanFields,
      });

      const body = buildBody({
        requestedEvidence: cleanEvidence,
        requestedFields: cleanFields,
        fieldRequests,
        claimNumber,
        recipientLabel,
      });

      const result = await prisma.$transaction(async (tx) => {
        const run = await tx.extractionRun.findUnique({
          where: { id: runId },
          select: { id: true },
        });

        if (!run) {
          throw new Error(`Extraction run not found: ${runId}`);
        }

        const latestDraft = await tx.followupDraft.findFirst({
          where: {
            runId,
            status: "DRAFTED",
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        if (latestDraft) {
          const existingEvidence = jsonStringArray(latestDraft.requestedEvidence);
          const existingFields = jsonStringArray(latestDraft.requestedFields);

          if (
            sameStringSet(existingEvidence, cleanEvidence) &&
            sameStringSet(existingFields, cleanFields)
          ) {
            return {
              draft: latestDraft,
              reused: true,
            };
          }
        }

        const createdDraft = await tx.followupDraft.create({
          data: {
            runId,
            requestType,
            subject,
            body,
            requestedEvidence: toPrismaJson(cleanEvidence),
            requestedFields: toPrismaJson(cleanFields),
            fieldRequests: toPrismaJson(fieldRequests),
            status: "DRAFTED",
          },
        });

        await tx.extractionEvent.create({
          data: {
            runId,
            type: "FOLLOWUP_DRAFT_CREATED",
            message: "Information request draft created by ClaimFlow agent.",
            metadata: toPrismaJson({
              followupDraftId: createdDraft.id,
              requestType,
              requestedEvidence: cleanEvidence,
              requestedFields: cleanFields,
              memoryGuidance: memoryGuidance ?? null,
              sourceToolName: "draft_information_request",
            }),
          },
        });

        return {
          draft: createdDraft,
          reused: false,
        };
      });

      return okToolResult({
        action: "DRAFT_INFORMATION_REQUEST",
        runId,
        message: result.reused
          ? "Existing matching information request draft reused. No duplicate draft was created."
          : "Information request draft created. No email was sent and no final claim decision was made.",
        data: {
          reused: result.reused,
          followupDraftId: result.draft.id,
          requestType: result.draft.requestType,
          subject: result.draft.subject,
          body: result.draft.body,
          requestedEvidence: result.draft.requestedEvidence,
          requestedFields: result.draft.requestedFields,
          fieldRequests: result.draft.fieldRequests,
          memoryGuidance: memoryGuidance ?? null,
          status: result.draft.status,
          createdAt: result.draft.createdAt.toISOString(),
        },
      });
    } catch (error) {
      return failedToolResult({
        action: "DRAFT_INFORMATION_REQUEST",
        runId,
        message: "Draft information request tool failed.",
        error: getErrorMessage(error),
      });
    }
  },
  {
    name: "draft_information_request",
    description:
      "Draft a request for missing claim fields and/or missing evidence. This only creates a draft and never sends email.",
    schema: DraftInformationRequestInputSchema,
  },
);
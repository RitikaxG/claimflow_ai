import { prisma } from "../packages/db/index.ts";

const sourceRunId = "cmrrnuvft0001jxy84u98p4oc";

const source = await prisma.extractionRun.findUnique({
  where: { id: sourceRunId },
  include: { document: true, reviewTask: true },
});

if (!source || !source.reviewTask) {
  throw new Error("Source walkthrough claim is unavailable.");
}

const suffix = Date.now();
const staged = await prisma.extractionRun.create({
  data: {
    document: {
      create: {
        filename: `claim-email-priya-shah-${suffix}.txt`,
        mimeType: source.document.mimeType,
        sizeBytes: source.document.sizeBytes,
        contentText: source.document.contentText,
        sourceType: source.document.sourceType,
        contentHash: `claimflow-product-walkthrough-${suffix}`,
      },
    },
    status: "NEEDS_REVIEW",
    model: source.model,
    promptVersion: source.promptVersion,
    schemaVersion: source.schemaVersion,
    rawModelOutput: source.rawModelOutput ?? undefined,
    extractedJson: source.extractedJson ?? undefined,
    validationJson: source.validationJson ?? undefined,
    missingFieldsJson: source.missingFieldsJson ?? undefined,
    confidenceJson: source.confidenceJson ?? undefined,
    events: {
      create: [
        { type: "DOCUMENT_UPLOADED", message: "Claim email received." },
        { type: "EXTRACTION_STARTED", message: "Claim preparation started." },
        { type: "MODEL_RESPONSE_RECEIVED", message: "Claim facts were organized." },
        { type: "EXTRACTION_COMPLETED", message: "Structured claim facts are ready." },
        { type: "VALIDATION_STARTED", message: "Completeness checks started." },
        {
          type: "VALIDATION_COMPLETED",
          message: "Claim checked for missing information and evidence.",
          metadata: {
            finalStatus: "NEEDS_REVIEW",
            missingFieldsCount: 1,
            requiredEvidenceCount: 2,
            warningsCount: 1,
            conflictsCount: 0,
          },
        },
        {
          type: "MISSING_FIELDS_DETECTED",
          message: "One missing field was identified.",
          metadata: { missingFields: ["police.firNumber"] },
        },
        {
          type: "RUN_NEEDS_REVIEW",
          message: "The claim needs reviewer attention.",
          metadata: {
            finalStatus: "NEEDS_REVIEW",
            requiredEvidence: ["firNumber", "policeReport"],
          },
        },
      ],
    },
    reviewTask: {
      create: {
        status: "PENDING",
        priority: "NORMAL",
        reasonJson: {
          sourceFinalStatus: "NEEDS_REVIEW",
          missingFields: ["police.firNumber"],
          requiredEvidence: ["firNumber", "policeReport"],
          warnings: [
            {
              field: "supportingDocuments.policeReport",
              ruleId: "THEFT_POLICE_REPORT_REQUIRED",
              message: "Police report is required or strongly recommended for theft claims.",
              severity: "warning",
            },
          ],
          conflicts: [],
        },
        events: {
          create: {
            type: "REVIEW_TASK_CREATED",
            message: "Review task created from the completed claim checks.",
            metadata: {
              sourceFinalStatus: "NEEDS_REVIEW",
              missingFieldsCount: 1,
              requiredEvidenceCount: 2,
              warningsCount: 1,
              conflictsCount: 0,
            },
          },
        },
      },
    },
  },
  include: { reviewTask: true },
});

console.log(JSON.stringify({ runId: staged.id, taskId: staged.reviewTask?.id }, null, 2));
await prisma.$disconnect();

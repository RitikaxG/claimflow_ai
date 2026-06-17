import { prisma } from "@repo/db";
import { diffCorrectedJson, type CorrectedJsonDiff } from "./diff-corrected-json";
import { createMemoryFromObservation } from "./create-memory-from-observation";
import { getString, isRecord } from "../utils/json";
import type { MemoryObservation } from "../types";

export type StableEntityHint = {
  entityType: string;
  entityId: string;
};

export type CreateMemoryFromReviewDecisionInput = {
  reviewDecisionId: string;
  entityHint?: StableEntityHint;
};

export type CreateMemoryFromReviewDecisionResult = {
  createdCount: number;
  skippedCount: number;
  memoryIds: string[];
};

const DEFAULT_MUST_NOT_DO = [
  "overwrite current extractedJson from memory",
  "treat memory as source-of-truth evidence",
  "approve or reject a future claim based only on memory",
];

function sanitizeFieldPathForId(fieldPath: string): string {
  return fieldPath.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function getNestedRecordValue(
  value: unknown,
  path: string[],
): unknown {
  let current: unknown = value;

  for (const key of path) {
    if (!isRecord(current)) {
      return null;
    }

    current = current[key];
  }

  return current;
}

function findStringAtPaths(
  value: unknown,
  paths: string[][],
): string | null {
  for (const path of paths) {
    const found = getString(getNestedRecordValue(value, path));

    if (found) {
      return found;
    }
  }

  return null;
}

function findClaimantEntityHint(...sources: unknown[]): StableEntityHint | null {
  for (const source of sources) {
    const customerId = findStringAtPaths(source, [
      ["customerId"],
      ["claimantId"],
      ["claimant", "customerId"],
      ["claimant", "claimantId"],
      ["customer", "customerId"],
      ["insured", "customerId"],
    ]);

    if (customerId) {
      return {
        entityType: "CLAIMANT",
        entityId: customerId,
      };
    }
  }

  return null;
}

function findPolicyEntityHint(...sources: unknown[]): StableEntityHint | null {
  for (const source of sources) {
    const policyId = findStringAtPaths(source, [
      ["policyId"],
      ["policyNumber"],
      ["policy", "policyId"],
      ["policy", "policyNumber"],
    ]);

    if (policyId) {
      return {
        entityType: "POLICY",
        entityId: policyId,
      };
    }
  }

  return null;
}

function findVendorEntityHint(...sources: unknown[]): StableEntityHint | null {
  for (const source of sources) {
    const vendorId = findStringAtPaths(source, [
      ["vendorId"],
      ["vendor", "vendorId"],
      ["repairVendorId"],
      ["repairVendor", "vendorId"],
      ["invoice", "vendorId"],
    ]);

    if (vendorId) {
      return {
        entityType: "VENDOR",
        entityId: vendorId,
      };
    }
  }

  return null;
}

function classifyDiff(input: {
  diff: CorrectedJsonDiff;
  explicitEntityHint?: StableEntityHint;
  claimantHint: StableEntityHint | null;
  policyHint: StableEntityHint | null;
  vendorHint: StableEntityHint | null;
  reviewDecisionId: string;
}): MemoryObservation | null {
  const {
    diff,
    explicitEntityHint,
    claimantHint,
    policyHint,
    vendorHint,
    reviewDecisionId,
  } = input;

  const normalizedPath = diff.fieldPath.toLowerCase();
  const observationId = `RDEC-${reviewDecisionId}-${sanitizeFieldPathForId(
    diff.fieldPath,
  )}`;

  if (
    normalizedPath === "policynumber" ||
    normalizedPath.endsWith(".policynumber")
  ) {
    const entity = explicitEntityHint ?? claimantHint ?? policyHint;

    if (!entity) {
      return null;
    }

    return {
      observationId,
      sourceType: "REVIEW_DECISION",
      sourceId: reviewDecisionId,
      sourcePacketId: null,
      historicalClaimId: null,
      observationType: "HUMAN_CORRECTION",
      entityType: entity.entityType,
      entityId: entity.entityId,
      fieldPath: diff.fieldPath,
      beforeValue: diff.beforeValue,
      afterValue: diff.afterValue,
      tags: ["human_verified", "policy_number_correction", "field_correction"],
      riskLevel: "MEDIUM",
      shouldCreateMemory: true,
      recommendedMemoryKind: "HUMAN_CORRECTION",
      summary: `Reviewer corrected ${diff.fieldPath} during claim review.`,
      safeUse:
        "Ask reviewer to verify policyNumber when a future similar claim has a missing or low-confidence policy number.",
      mustNotDo: [
        "overwrite extractedJson.policyNumber",
        "treat the old policy number as current truth",
        "approve claim based on memory",
      ],
      evidenceJson: {
        reviewDecisionId,
        fieldPath: diff.fieldPath,
        changeType: diff.changeType,
        updateSummary: diff.updateSummary
      },
    };
  }

  if (
    normalizedPath === "insuredname" ||
    normalizedPath.endsWith(".insuredname")
  ) {
    const entity = explicitEntityHint ?? claimantHint;

    if (!entity) {
      return null;
    }

    return {
      observationId,
      sourceType: "REVIEW_DECISION",
      sourceId: reviewDecisionId,
      sourcePacketId: null,
      historicalClaimId: null,
      observationType: "HUMAN_CORRECTION",
      entityType: entity.entityType,
      entityId: entity.entityId,
      fieldPath: diff.fieldPath,
      beforeValue: diff.beforeValue,
      afterValue: diff.afterValue,
      tags: ["human_verified", "insured_name_correction", "field_correction"],
      riskLevel: "LOW",
      shouldCreateMemory: true,
      recommendedMemoryKind: "HUMAN_CORRECTION",
      summary: `Reviewer corrected ${diff.fieldPath} spelling during claim review.`,
      safeUse:
        "Ask reviewer to verify insuredName spelling against current documents when extraction confidence is low.",
      mustNotDo: [
        "replace current insuredName from memory",
        "merge near-name claimants without stable identifiers",
        "treat spelling memory as fraud evidence",
      ],
      evidenceJson: {
        reviewDecisionId,
        fieldPath: diff.fieldPath,
        changeType: diff.changeType,
        updateSummary: diff.updateSummary,
      },
    };
  }

  if (
    normalizedPath === "vehicle.registrationnumber" ||
    normalizedPath.endsWith(".vehicle.registrationnumber")
  ) {
    const entity = explicitEntityHint ?? policyHint ?? claimantHint;

    if (!entity) {
      return null;
    }

    return {
      observationId,
      sourceType: "REVIEW_DECISION",
      sourceId: reviewDecisionId,
      sourcePacketId: null,
      historicalClaimId: null,
      observationType: "HUMAN_CORRECTION",
      entityType: entity.entityType,
      entityId: entity.entityId,
      fieldPath: diff.fieldPath,
      beforeValue: diff.beforeValue,
      afterValue: diff.afterValue,
      tags: [
        "human_verified",
        "vehicle_registration_number_correction",
        "field_correction",
        "missing_field:vehicle_registration_number",
        "vehicle_registration_number_missing",
      ],
      riskLevel: "MEDIUM",
      shouldCreateMemory: true,
      recommendedMemoryKind: "HUMAN_CORRECTION",
      summary: `Reviewer corrected ${diff.fieldPath} during claim review.`,
      safeUse:
        "Ask reviewer to verify vehicle.registrationNumber when a future similar claim for this policy or claimant is missing the registration number.",
      mustNotDo: [
        "fill vehicle.registrationNumber from memory",
        "overwrite current extractedJson.vehicle.registrationNumber",
        "treat memory as vehicle registration evidence",
        "approve claim based on memory",
      ],
      evidenceJson: {
        reviewDecisionId,
        fieldPath: diff.fieldPath,
        changeType: diff.changeType,
        updateSummary: diff.updateSummary,
      },
    };
  }

  if (
    normalizedPath === "invoice.amount" ||
    normalizedPath.endsWith(".invoice.amount") ||
    normalizedPath.endsWith(".amount")
  ) {
    const entity =
      vendorHint ??
      (explicitEntityHint?.entityType === "VENDOR" ? explicitEntityHint : null);

    if (!entity) {
      return null;
    }

    return {
      observationId,
      sourceType: "REVIEW_DECISION",
      sourceId: reviewDecisionId,
      sourcePacketId: null,
      historicalClaimId: null,
      observationType: "VENDOR_PATTERN",
      entityType: entity.entityType,
      entityId: entity.entityId,
      fieldPath: diff.fieldPath,
      beforeValue: diff.beforeValue,
      afterValue: diff.afterValue,
      tags: ["vendor_pattern", "invoice_conflict", "amount_correction"],
      riskLevel: "HIGH",
      shouldCreateMemory: true,
      recommendedMemoryKind: "VENDOR_PATTERN",
      summary:
        "Reviewer corrected or challenged an invoice amount connected to this vendor.",
      safeUse:
        "Flag future invoice amount conflicts from this vendor for human review.",
      mustNotDo: [
        "overwrite invoice amount",
        "pick an amount automatically",
        "reject or approve based only on vendor memory",
      ],
      evidenceJson: {
        reviewDecisionId,
        fieldPath: diff.fieldPath,
        changeType: diff.changeType,
        updateSummary: diff.updateSummary
      },
    };
  }

  if (
    normalizedPath === "requiredevidence" ||
    normalizedPath.startsWith("requiredevidence.") ||
    normalizedPath.includes("requiredevidence")
  ) {
    const entity = explicitEntityHint ?? policyHint;

    if (!entity) {
      return null;
    }

    return {
      observationId,
      sourceType: "REVIEW_DECISION",
      sourceId: reviewDecisionId,
      sourcePacketId: null,
      historicalClaimId: null,
      observationType: "PRIOR_REVIEW_DECISION",
      entityType: entity.entityType,
      entityId: entity.entityId,
      fieldPath: diff.fieldPath,
      beforeValue: diff.beforeValue,
      afterValue: diff.afterValue,
      tags: ["required_evidence", "review_decision", "human_review"],
      riskLevel: "MEDIUM",
      shouldCreateMemory: true,
      recommendedMemoryKind: "PRIOR_REVIEW_DECISION",
      summary: `Reviewer changed required evidence at ${diff.fieldPath}.`,
      safeUse:
        "For future similar claims, check current validation before drafting evidence requests.",
      mustNotDo: [
        "mark evidence missing without current validation",
        "reuse old request text blindly",
        "block claim using memory alone",
      ],
      evidenceJson: {
        reviewDecisionId,
        fieldPath: diff.fieldPath,
        changeType: diff.changeType,
        updateSummary: diff.updateSummary
      },
    };
  }

  return null;
}

function buildPriorRejectionObservation(input: {
  reviewDecisionId: string;
  claimantHint: StableEntityHint;
  notes: string | null;
}): MemoryObservation {
  return {
    observationId: `RDEC-${input.reviewDecisionId}-prior-rejection`,
    sourceType: "REVIEW_DECISION",
    sourceId: input.reviewDecisionId,
    sourcePacketId: null,
    historicalClaimId: null,
    observationType: "PRIOR_REJECTION",
    entityType: input.claimantHint.entityType,
    entityId: input.claimantHint.entityId,
    fieldPath: null,
    beforeValue: null,
    afterValue: "REJECT",
    tags: ["prior_rejection", "human_review"],
    riskLevel: "HIGH",
    shouldCreateMemory: true,
    recommendedMemoryKind: "PRIOR_REJECTION",
    summary: "Reviewer previously rejected a claim for this claimant.",
    safeUse:
      "Use this only as a routing signal when current claim signals are similar; send to human review.",
    mustNotDo: [
      "auto-reject a future claim",
      "use prior rejection as policy evidence",
      "draft denial reason based only on memory",
    ],
    evidenceJson: {
      reviewDecisionId: input.reviewDecisionId,
      reviewerNotes: input.notes,
    },
  };
}

export async function createMemoryFromReviewDecision(
  input: CreateMemoryFromReviewDecisionInput,
): Promise<CreateMemoryFromReviewDecisionResult> {
  const decision = await prisma.reviewDecision.findUnique({
    where: {
      id: input.reviewDecisionId,
    },
    include: {
      task: {
        include: {
          run: true,
        },
      },
    },
  });

  if (!decision) {
    throw new Error(`ReviewDecision not found: ${input.reviewDecisionId}`);
  }

  const run = decision.task.run;

  const claimantHint =
    input.entityHint?.entityType === "CLAIMANT"
      ? input.entityHint
      : findClaimantEntityHint(decision.correctedJson, run.extractedJson);

  const policyHint =
    input.entityHint?.entityType === "POLICY"
      ? input.entityHint
      : findPolicyEntityHint(decision.correctedJson, run.extractedJson);

  const vendorHint =
    input.entityHint?.entityType === "VENDOR"
      ? input.entityHint
      : findVendorEntityHint(decision.correctedJson, run.extractedJson);

  const observations: MemoryObservation[] = [];

  if (decision.decision === "EDIT_AND_APPROVE" && decision.correctedJson) {
    const diffs = diffCorrectedJson(run.extractedJson, decision.correctedJson);

    for (const diff of diffs) {
      const observation = classifyDiff({
        diff,
        explicitEntityHint: input.entityHint,
        claimantHint,
        policyHint,
        vendorHint,
        reviewDecisionId: decision.id,
      });

      if (observation) {
        observations.push(observation);
      }
    }
  }

  if (decision.decision === "REJECT") {
    const rejectionEntity = input.entityHint ?? claimantHint;

    if (rejectionEntity?.entityType === "CLAIMANT") {
      observations.push(
        buildPriorRejectionObservation({
          reviewDecisionId: decision.id,
          claimantHint: rejectionEntity,
          notes: decision.notes ?? null,
        }),
      );
    }
  }

  let createdCount = 0;
  let skippedCount = 0;
  const memoryIds: string[] = [];

  if (observations.length === 0) {
    return {
      createdCount: 0,
      skippedCount: 1,
      memoryIds: [],
    };
  }

  for (const observation of observations) {
    const result = await createMemoryFromObservation(observation);

    if (result.memoryId) {
      memoryIds.push(result.memoryId);
    }

    if (result.skipped) {
      skippedCount += 1;
    } else {
      createdCount += 1;
    }
  }

  return {
    createdCount,
    skippedCount,
    memoryIds,
  };
}
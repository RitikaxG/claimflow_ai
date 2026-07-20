import assert from "node:assert/strict";
import { buildMemoryQuery } from "../retrieval/build-memory-query";
import {
  scoreMemory,
  type WorkflowMemoryLike,
} from "../retrieval/score-memory";
import { getWorkflowMemoryDisplayKey } from "../retrieval/workflow-memory-fingerprint";

function workflowMemory(tags: string[]): WorkflowMemoryLike {
  return {
    id: "memory-completed-review",
    kind: "PRIOR_REVIEW_DECISION",
    status: "ACTIVE",
    riskLevel: "LOW",
    confidence: 0.6,
    summary: "A human reviewer completed a comparable workflow.",
    safeUse: "Use only to surface workflow checks.",
    mustNotDo: ["treat memory as claim evidence"],
    entityType: "WORKFLOW",
    entityId: "review-decision-1",
    fieldPath: "workflow.reviewOutcome",
    tags,
    confirmedCount: 0,
    contradictedCount: 0,
  };
}

const query = buildMemoryQuery({
  runId: "current-run",
  claimState: {
    extractedJson: {
      claimType: "Motor claim",
      lossType: "Theft",
      vehicle: {
        registrationNumber: "CURRENT-CLAIM-VALUE",
      },
    },
    validationJson: {
      missingFields: ["police.firNumber"],
      requiredEvidence: ["policeReport"],
    },
  },
});

assert.equal(query.claimType, "Motor claim");
assert.equal(query.lossType, "Theft");
assert.equal(query.evidenceProfile, "police_report");
assert.equal(query.validationPattern, "evidence_required+missing_fields");

const comparable = scoreMemory({
  memory: workflowMemory([
    "claim_type:motor_claim",
    "loss_type:theft",
    "evidence_profile:police_report",
    "validation_pattern:evidence_required+missing_fields",
    "human_verified",
  ]),
  query,
});

assert.equal(comparable.isEligible, true);
assert.deepEqual(
  new Set(comparable.matchedOn.map((signal) => signal.type)),
  new Set([
    "SAME_CLAIM_TYPE",
    "SAME_LOSS_TYPE",
    "EVIDENCE_PROFILE_MATCH",
    "VALIDATION_PATTERN_MATCH",
    "HUMAN_VERIFIED_MEMORY",
  ]),
);

const looseLossTypeOnly = scoreMemory({
  memory: workflowMemory(["loss_type:theft", "human_verified"]),
  query,
});

assert.equal(looseLossTypeOnly.isEligible, false);
assert.equal(
  looseLossTypeOnly.matchedOn.some(
    (signal) => signal.type === "SAME_LOSS_TYPE",
  ),
  true,
);

const missingFieldOnly = scoreMemory({
  memory: workflowMemory([
    "missing_field:police_fir_number",
    "evidence_profile:different_document",
    "validation_pattern:conflicts",
    "human_verified",
  ]),
  query,
});

assert.equal(
  missingFieldOnly.matchedOn.some(
    (signal) => signal.type === "MISSING_FIELD_MATCH",
  ),
  true,
);
assert.equal(missingFieldOnly.isEligible, false);

const sameTheftAndMissingFir = scoreMemory({
  memory: workflowMemory([
    "claim_type:motor_claim",
    "loss_type:theft",
    "missing_field:police_fir_number",
    "evidence_profile:evidence_complete",
    "validation_pattern:missing_fields",
    "human_verified",
    "review_outcome:edit_and_approve",
  ]),
  query,
});

assert.equal(sameTheftAndMissingFir.isEligible, true);
assert.equal(
  sameTheftAndMissingFir.matchedOn.some(
    (signal) => signal.type === "MISSING_FIELD_MATCH",
  ),
  true,
);

const equivalentWorkflowMemory = workflowMemory([
  "review_outcome:edit_and_approve",
  "validation_pattern:evidence_required+missing_fields",
  "required_evidence:police_report",
  "loss_type:theft",
  "claim_type:motor_claim",
  "missing_field:police_fir_number",
]);
equivalentWorkflowMemory.id = "another-approved-claim";
equivalentWorkflowMemory.entityId = "review-decision-2";

const originalWorkflowMemory = workflowMemory([
  "missing_field:police_fir_number",
  "claim_type:motor_claim",
  "loss_type:theft",
  "required_evidence:police_report",
  "validation_pattern:evidence_required+missing_fields",
  "review_outcome:edit_and_approve",
]);

assert.equal(
  getWorkflowMemoryDisplayKey(equivalentWorkflowMemory),
  getWorkflowMemoryDisplayKey(originalWorkflowMemory),
);
assert.equal(
  sameTheftAndMissingFir.matchedOn.some(
    (signal) => signal.type === "SAME_LOSS_TYPE",
  ),
  true,
);

const differentLossType = scoreMemory({
  memory: workflowMemory([
    "claim_type:motor_claim",
    "loss_type:third_party",
    "required_evidence:police_report",
    "validation_pattern:evidence_required+missing_fields",
    "human_verified",
  ]),
  query,
});

assert.equal(differentLossType.isEligible, false);

console.log(
  "PASS - completed-review memory matches safe claim profiles and exact workflow gaps.",
);

import { prisma } from "../index";

export const DEMO_IDS = {
  documents: ["demo_doc_complete", "demo_doc_review", "demo_doc_failure"],
  runs: ["demo_run_complete", "demo_run_review", "demo_run_failure"],
  memories: ["demo_memory_registration"],
  evalRuns: [
    "demo_eval_week1",
    "demo_eval_week2",
    "demo_eval_week3",
    "demo_eval_week4",
    "demo_eval_week5",
    "demo_eval_week6",
  ],
} as const;

const baseClaim = {
  claimant: {
    name: "Aarav Sharma",
    email: "aarav.sharma@example.com",
    phone: "+91-98765-43210",
  },
  policy: {
    policyNumber: "CF-MOTOR-2025-4421",
    productType: "MOTOR_OWN_DAMAGE",
  },
  incident: {
    date: "2026-06-12",
    location: "Patna, Bihar",
    description: "Rear bumper and tail lamp damaged in a low-speed collision.",
  },
  vehicle: {
    make: "Tata",
    model: "Nexon",
    registrationNumber: "BR01DX4421",
  },
  claimedAmount: 48500,
};

const validationComplete = {
  isValid: true,
  summary: "All required claim fields and evidence are present.",
  missingFields: [],
  conflicts: [],
  warnings: [],
  requiredEvidence: [],
};

const validationNeedsReview = {
  isValid: false,
  summary: "Vehicle registration number requires human-provided information.",
  missingFields: ["vehicle.registrationNumber"],
  conflicts: [],
  warnings: ["A prior correction for this policy was retrieved as workflow memory."],
  requiredEvidence: [],
};

async function removeDemoData() {
  await prisma.$transaction(async (tx) => {
    await tx.aiCallLog.deleteMany({ where: { id: { startsWith: "demo_" } } });
    await tx.evalRun.deleteMany({ where: { id: { in: [...DEMO_IDS.evalRuns] } } });
    await tx.workflowMemory.deleteMany({ where: { id: { in: [...DEMO_IDS.memories] } } });
    await tx.document.deleteMany({ where: { id: { in: [...DEMO_IDS.documents] } } });
  });
}

export async function resetDemoData() {
  await removeDemoData();
}

export async function seedDemoData() {
  await removeDemoData();

  const now = new Date();
  const at = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60_000);

  await prisma.$transaction(async (tx) => {
    await tx.document.createMany({
      data: [
        {
          id: DEMO_IDS.documents[0],
          filename: "motor-claim-complete.eml",
          mimeType: "text/plain",
          sizeBytes: 1184,
          contentText: "Complete motor claim for policy CF-MOTOR-2025-4421 with repair estimate and registration BR01DX4421.",
          sourceType: "EMAIL_TEXT",
          contentHash: "demo-complete-v1",
          createdAt: at(90),
          updatedAt: at(84),
        },
        {
          id: DEMO_IDS.documents[1],
          filename: "motor-claim-missing-registration.eml",
          mimeType: "text/plain",
          sizeBytes: 947,
          contentText: "Motor claim for policy CF-MOTOR-2025-4421. The vehicle registration number is not included.",
          sourceType: "EMAIL_TEXT",
          contentHash: "demo-review-v1",
          createdAt: at(42),
          updatedAt: at(36),
        },
        {
          id: DEMO_IDS.documents[2],
          filename: "provider-timeout-claim.eml",
          mimeType: "text/plain",
          sizeBytes: 621,
          contentText: "Synthetic claim used to demonstrate safe provider failure handling.",
          sourceType: "EMAIL_TEXT",
          contentHash: "demo-failure-v1",
          createdAt: at(18),
          updatedAt: at(17),
        },
      ],
    });

    await tx.extractionRun.createMany({
      data: [
        {
          id: DEMO_IDS.runs[0],
          documentId: DEMO_IDS.documents[0],
          status: "COMPLETED",
          model: "gemini-2.5-flash",
          promptVersion: "claim-extraction-v3",
          schemaVersion: "auto_claim_v1",
          extractedJson: baseClaim,
          validationJson: validationComplete,
          missingFieldsJson: [],
          confidenceJson: { overall: 0.96, fields: { policyNumber: 0.99, registrationNumber: 0.98 } },
          createdAt: at(90),
          updatedAt: at(84),
        },
        {
          id: DEMO_IDS.runs[1],
          documentId: DEMO_IDS.documents[1],
          status: "NEEDS_REVIEW",
          model: "gemini-2.5-flash",
          promptVersion: "claim-extraction-v3",
          schemaVersion: "auto_claim_v1",
          extractedJson: { ...baseClaim, vehicle: { ...baseClaim.vehicle, registrationNumber: null } },
          validationJson: validationNeedsReview,
          missingFieldsJson: ["vehicle.registrationNumber"],
          confidenceJson: { overall: 0.87, fields: { policyNumber: 0.99, registrationNumber: 0 } },
          createdAt: at(42),
          updatedAt: at(36),
        },
        {
          id: DEMO_IDS.runs[2],
          documentId: DEMO_IDS.documents[2],
          status: "FAILED",
          model: "gemini-2.5-flash",
          promptVersion: "claim-extraction-v3",
          schemaVersion: "auto_claim_v1",
          errorMessage: "Model provider timed out. The call is safe to retry.",
          createdAt: at(18),
          updatedAt: at(17),
        },
      ],
    });

    await tx.extractionEvent.createMany({
      data: [
        { id: "demo_event_complete_1", runId: DEMO_IDS.runs[0], type: "DOCUMENT_UPLOADED", message: "Claim email received.", createdAt: at(90) },
        { id: "demo_event_complete_2", runId: DEMO_IDS.runs[0], type: "EXTRACTION_COMPLETED", message: "Structured claim extracted through the AI gateway.", createdAt: at(88) },
        { id: "demo_event_complete_3", runId: DEMO_IDS.runs[0], type: "VALIDATION_COMPLETED", message: "Deterministic validation passed.", createdAt: at(87) },
        { id: "demo_event_complete_4", runId: DEMO_IDS.runs[0], type: "RUN_COMPLETED", message: "Claim intake completed.", createdAt: at(84) },
        { id: "demo_event_review_1", runId: DEMO_IDS.runs[1], type: "DOCUMENT_UPLOADED", message: "Claim email received.", createdAt: at(42) },
        { id: "demo_event_review_2", runId: DEMO_IDS.runs[1], type: "EXTRACTION_COMPLETED", message: "Structured claim extracted through the AI gateway.", createdAt: at(40) },
        { id: "demo_event_review_3", runId: DEMO_IDS.runs[1], type: "MISSING_FIELDS_DETECTED", message: "Vehicle registration number is missing.", createdAt: at(39) },
        { id: "demo_event_review_4", runId: DEMO_IDS.runs[1], type: "MEMORY_RETRIEVED", message: "A policy-level correction memory was retrieved.", createdAt: at(38) },
        { id: "demo_event_review_5", runId: DEMO_IDS.runs[1], type: "AGENT_TOOL_EXECUTED", message: "A guarded information request draft was created.", createdAt: at(37) },
        { id: "demo_event_review_6", runId: DEMO_IDS.runs[1], type: "RUN_NEEDS_REVIEW", message: "Human review is required before the workflow can continue.", createdAt: at(36) },
        { id: "demo_event_failure_1", runId: DEMO_IDS.runs[2], type: "DOCUMENT_UPLOADED", message: "Synthetic failure claim received.", createdAt: at(18) },
        { id: "demo_event_failure_2", runId: DEMO_IDS.runs[2], type: "EXTRACTION_STARTED", message: "Extraction call started.", createdAt: at(18) },
        { id: "demo_event_failure_3", runId: DEMO_IDS.runs[2], type: "RUN_FAILED", message: "Provider timeout classified as retryable.", createdAt: at(17) },
      ],
    });

    await tx.reviewTask.create({
      data: {
        id: "demo_review_task_pending",
        runId: DEMO_IDS.runs[1],
        status: "PENDING",
        priority: "HIGH",
        reasonJson: { missingFields: ["vehicle.registrationNumber"], reason: "Required motor-claim identifier is absent." },
        createdAt: at(36),
        updatedAt: at(36),
      },
    });

    await tx.followupDraft.create({
      data: {
        id: "demo_followup_registration",
        runId: DEMO_IDS.runs[1],
        requestType: "FIELD_CLARIFICATION",
        subject: "Registration number required for claim CF-MOTOR-2025-4421",
        body: "Please reply with the vehicle registration number so the claim can proceed to review.",
        requestedEvidence: [],
        requestedFields: ["vehicle.registrationNumber"],
        fieldRequests: [{ fieldPath: "vehicle.registrationNumber", label: "Vehicle registration number" }],
        status: "DRAFTED",
        createdAt: at(37),
        updatedAt: at(37),
      },
    });

    await tx.workflowMemory.create({
      data: {
        id: DEMO_IDS.memories[0],
        kind: "HUMAN_CORRECTION",
        status: "STRENGTHENED",
        riskLevel: "LOW",
        confidence: 0.86,
        summary: "Claims for policy CF-MOTOR-2025-4421 have previously required a corrected vehicle registration number.",
        safeUse: "Use only to prioritize the missing field and explain why it needs review; never autofill the value.",
        mustNotDo: ["Do not copy a prior registration number into a new claim.", "Do not bypass human review."],
        entityType: "POLICY",
        entityId: "CF-MOTOR-2025-4421",
        fieldPath: "vehicle.registrationNumber",
        tags: ["motor", "registration", "human-correction"],
        confirmedCount: 2,
        sourceRunId: DEMO_IDS.runs[0],
        lastUsedAt: at(38),
        createdAt: at(80),
        updatedAt: at(38),
      },
    });

    await tx.agentActionLog.create({
      data: {
        id: "demo_agent_action_request_info",
        runId: DEMO_IDS.runs[1],
        action: "DRAFT_INFORMATION_REQUEST",
        status: "EXECUTED",
        rationale: "A required field is missing. Memory may prioritize the field but cannot supply its value.",
        guardrailDecision: "ALLOWED",
        toolName: "draftInformationRequest",
        toolInputJson: { fields: ["vehicle.registrationNumber"] },
        toolOutputJson: { followupDraftId: "demo_followup_registration" },
        createdAt: at(37),
      },
    });

    await tx.memoryHit.create({
      data: {
        id: "demo_memory_hit_registration",
        memoryId: DEMO_IDS.memories[0],
        runId: DEMO_IDS.runs[1],
        score: 96,
        matchedOn: ["entityId", "fieldPath", "productType"],
        retrievalReason: "Exact policy and missing-field match.",
        usedByAgent: true,
        agentActionLogId: "demo_agent_action_request_info",
        createdAt: at(38),
      },
    });

    await tx.coverageQuestion.create({
      data: {
        id: "demo_coverage_complete",
        runId: DEMO_IDS.runs[0],
        question: "Is accidental rear-bumper damage covered?",
        normalizedQuery: "motor own-damage accidental collision rear bumper coverage",
        retrievalStatus: "ENOUGH_EVIDENCE",
        retrievalJson: { clauses: [{ clauseId: "OD-1.1", title: "Accidental external damage", score: 0.93 }] },
        answerJson: { answer: "Covered, subject to deductible and policy terms.", citations: ["OD-1.1"] },
        finalDecision: "COVERED",
        createdAt: at(85),
      },
    });

    await tx.aiCallLog.createMany({
      data: [
        {
          id: "demo_ai_call_success",
          traceId: "trace_demo_complete_01",
          runId: DEMO_IDS.runs[0],
          kind: "EXTRACTION",
          status: "SUCCEEDED",
          provider: "google",
          model: "gemini-2.5-flash",
          modelVersion: "gemini-2.5-flash-2026-05",
          promptVersion: "claim-extraction-v3",
          schemaVersion: "auto_claim_v1",
          parsedOutputJson: baseClaim,
          latencyMs: 842,
          inputTokens: 1160,
          outputTokens: 438,
          totalTokens: 1598,
          estimatedCostUsd: 0.0018,
          createdAt: at(88),
          updatedAt: at(88),
        },
        {
          id: "demo_ai_call_review",
          traceId: "trace_demo_review_01",
          runId: DEMO_IDS.runs[1],
          kind: "EXTRACTION",
          status: "SUCCEEDED",
          provider: "google",
          model: "gemini-2.5-flash",
          modelVersion: "gemini-2.5-flash-2026-05",
          promptVersion: "claim-extraction-v3",
          schemaVersion: "auto_claim_v1",
          latencyMs: 911,
          totalTokens: 1422,
          estimatedCostUsd: 0.0016,
          createdAt: at(40),
          updatedAt: at(40),
        },
        {
          id: "demo_ai_call_timeout",
          traceId: "trace_demo_failure_01",
          runId: DEMO_IDS.runs[2],
          kind: "EXTRACTION",
          status: "RETRYABLE",
          provider: "google",
          model: "gemini-2.5-flash",
          modelVersion: "gemini-2.5-flash-2026-05",
          promptVersion: "claim-extraction-v3",
          schemaVersion: "auto_claim_v1",
          errorType: "MODEL_TIMEOUT",
          errorMessage: "Gateway timeout after 8000ms.",
          retryable: true,
          latencyMs: 8001,
          estimatedCostUsd: 0,
          createdAt: at(17),
          updatedAt: at(17),
        },
      ],
    });

    const evals = [
      [DEMO_IDS.evalRuns[0], "WEEK1_EXTRACTION", "Extraction quality", 12, 12, 0, 1, { schema_valid_rate: 1, exact_field_accuracy: 0.96 }],
      [DEMO_IDS.evalRuns[1], "WEEK2_REVIEW", "Human review workflow", 10, 10, 0, 0, { correct_routing_rate: 1 }],
      [DEMO_IDS.evalRuns[2], "WEEK3_RAG", "Policy-grounded coverage", 12, 11, 0, 1, { citation_precision: 0.94, abstention_accuracy: 1 }],
      [DEMO_IDS.evalRuns[3], "WEEK4_AGENT", "Guarded agent actions", 14, 14, 0, 0, { guardrail_enforcement_rate: 1, correct_action_rate: 0.93 }],
      [DEMO_IDS.evalRuns[4], "WEEK5_MEMORY", "Safe workflow memory", 12, 12, 0, 0, { relevant_retrieval_rate: 0.92, unsafe_autofill_rate: 0 }],
      [DEMO_IDS.evalRuns[5], "WEEK6_GATEWAY_OBSERVABILITY", "Gateway failure observability", 9, 9, 0, 0, { eval_pass_rate: 1, latency_p95: 8001, model_error_rate: 0.22, missing_trace_rate: 0, cost_per_run: 0.0011 }],
    ] as const;

    for (const [id, suite, label, total, passed, failed, warnings, metrics] of evals) {
      await tx.evalRun.create({
        data: {
          id,
          suite,
          label,
          totalCases: total,
          passedCases: passed,
          failedCases: failed,
          warningCases: warnings,
          passRate: passed / total,
          averageScore: passed / total,
          metricsJson: metrics,
          metadataJson: { source: "portfolio-demo-seed", deterministic: true },
          createdAt: at(12 - evals.findIndex((entry) => entry[0] === id)),
          cases: {
            create: Array.from({ length: total }, (_, index) => ({
              id: `${id}_case_${index + 1}`,
              caseId: `${String(suite).toLowerCase()}-${String(index + 1).padStart(3, "0")}`,
              status: index < passed ? "PASSED" : failed > 0 && index < passed + failed ? "FAILED" : "WARNING",
              score: index < passed ? 1 : 0.75,
              metadataJson: { seeded: true },
            })),
          },
        },
      });
    }
  }, { timeout: 30_000 });

  return {
    runIds: [...DEMO_IDS.runs],
    evalRunIds: [...DEMO_IDS.evalRuns],
    seededAt: now.toISOString(),
  };
}

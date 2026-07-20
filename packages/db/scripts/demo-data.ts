import { prisma } from "../index";

export const DEMO_IDS = {
  documents: [
    "demo_doc_ready",
    "demo_doc_waiting",
    "demo_doc_reopened",
    "demo_doc_resolved",
  ],
  runs: [
    "demo_run_ready",
    "demo_run_waiting",
    "demo_run_reopened",
    "demo_run_resolved",
  ],
  memories: ["demo_memory_prior_theft", "demo_memory_resolved_review"],
  evalRuns: [
    "demo_eval_week1",
    "demo_eval_week2",
    "demo_eval_week3",
    "demo_eval_week4",
    "demo_eval_week5",
    "demo_eval_week6",
  ],
} as const;

const legacyDemoDocumentIds = [
  "demo_doc_complete",
  "demo_doc_review",
  "demo_doc_failure",
];

type DemoClaimInput = {
  claimNumber: string;
  policyNumber: string;
  claimantName: string;
  email: string;
  registrationNumber: string;
  make: string;
  model: string;
  incidentDate: string;
  location: string;
  lossType: "own_damage" | "third_party" | "theft";
  description: string;
  repairCost: number;
  firNumber?: string | null;
  policeReport?: boolean;
  confidence?: number;
};

function demoClaim(input: DemoClaimInput) {
  return {
    documentType: "claim_email",
    claimNumber: input.claimNumber,
    policyNumber: input.policyNumber,
    insuredName: input.claimantName,
    claimantName: input.claimantName,
    contactEmail: input.email,
    contactPhone: "+91-98765-43210",
    vehicle: {
      registrationNumber: input.registrationNumber,
      make: input.make,
      model: input.model,
      year: "2023",
      engineNumber: null,
      chassisNumber: null,
    },
    incident: {
      incidentDate: input.incidentDate,
      incidentTime: "18:30",
      incidentLocation: input.location,
      lossType: input.lossType,
      description: input.description,
    },
    damage: {
      damagedParts:
        input.lossType === "theft" ? [] : ["rear bumper", "tail lamp"],
      damageSeverity: input.lossType === "theft" ? "severe" : "moderate",
      estimatedRepairCost: input.repairCost,
      currency: "INR",
    },
    police: {
      wasReportedToPolice:
        input.lossType === "theft" ? Boolean(input.firNumber) : false,
      policeStation: input.firNumber ? "Indiranagar Police Station" : null,
      firNumber: input.firNumber ?? null,
      reportDate: input.firNumber ? "2026-07-18" : null,
    },
    supportingDocuments: {
      claimForm: true,
      damagePhoto: input.lossType !== "theft",
      repairEstimate: input.lossType !== "theft",
      policeReport: input.policeReport ?? false,
    },
    missingEvidence:
      input.lossType === "theft" && !input.policeReport
        ? ["firNumber", "policeReport"]
        : [],
    overallConfidence: input.confidence ?? 0.94,
  };
}

const readyClaim = demoClaim({
  claimNumber: "CLM-DEMO-1001",
  policyNumber: "POL-CF-2026-1001",
  claimantName: "Anika Rao",
  email: "anika.rao@example.com",
  registrationNumber: "KA03MR4281",
  make: "Hyundai",
  model: "i20",
  incidentDate: "2026-07-16",
  location: "Koramangala, Bengaluru",
  lossType: "own_damage",
  description:
    "Rear bumper and tail lamp were damaged in a low-speed collision.",
  repairCost: 48500,
});

const waitingClaim = demoClaim({
  claimNumber: "CLM-DEMO-1002",
  policyNumber: "POL-CF-2026-1002",
  claimantName: "Kabir Mehta",
  email: "kabir.mehta@example.com",
  registrationNumber: "MH02EP7714",
  make: "Honda",
  model: "City",
  incidentDate: "2026-07-17",
  location: "Bandra, Mumbai",
  lossType: "theft",
  description:
    "The insured vehicle was reported stolen from a residential parking area.",
  repairCost: 875000,
  confidence: 0.91,
});

const reopenedOriginalClaim = demoClaim({
  claimNumber: "CLM-DEMO-1003",
  policyNumber: "POL-CF-2026-1003",
  claimantName: "Sanya Kulkarni",
  email: "sanya.kulkarni@example.com",
  registrationNumber: "KA05NK2094",
  make: "Tata",
  model: "Nexon XZ+",
  incidentDate: "2026-07-18",
  location: "Koregaon Park, Pune",
  lossType: "theft",
  description:
    "The vehicle was stolen overnight from the claimant's apartment parking area.",
  repairCost: 920000,
  confidence: 0.9,
});

const resolvedOriginalClaim = demoClaim({
  claimNumber: "CLM-DEMO-1004",
  policyNumber: "POL-CF-2026-1004",
  claimantName: "Dev Malhotra",
  email: "dev.malhotra@example.com",
  registrationNumber: "DL08CZ6112",
  make: "Maruti",
  model: "Brezza",
  incidentDate: "2026-07-12",
  location: "Saket, New Delhi",
  lossType: "theft",
  description: "The vehicle was stolen from a secured office parking facility.",
  repairCost: 810000,
  confidence: 0.92,
});

const resolvedCorrectedClaim = demoClaim({
  claimNumber: "CLM-DEMO-1004",
  policyNumber: "POL-CF-2026-1004",
  claimantName: "Dev Malhotra",
  email: "dev.malhotra@example.com",
  registrationNumber: "DL08CZ6112",
  make: "Maruti",
  model: "Brezza",
  incidentDate: "2026-07-12",
  location: "Saket, New Delhi",
  lossType: "theft",
  description: "The vehicle was stolen from a secured office parking facility.",
  repairCost: 810000,
  firNumber: "FIR-DL-2026-4187",
  policeReport: true,
  confidence: 0.98,
});

const validationComplete = {
  isValid: true,
  missingFields: [],
  conflicts: [],
  warnings: [],
  requiredEvidence: [],
  finalStatus: "COMPLETED",
};

const validationMissingPoliceInformation = {
  isValid: false,
  missingFields: ["police.firNumber"],
  conflicts: [],
  warnings: [
    {
      field: "supportingDocuments.policeReport",
      message: "Police report is required for a theft claim.",
      severity: "warning",
      ruleId: "THEFT_POLICE_REPORT_REQUIRED",
    },
  ],
  requiredEvidence: ["firNumber", "policeReport"],
  finalStatus: "NEEDS_REVIEW",
};

const requestReason = {
  missingFields: ["police.firNumber"],
  conflicts: [],
  warnings: validationMissingPoliceInformation.warnings,
  requiredEvidence: ["firNumber", "policeReport"],
  recommendation:
    "Request the FIR number and police report, then return the claim to human review.",
};

async function removeDemoData() {
  await prisma.$transaction(async (tx) => {
    await tx.aiCallLog.deleteMany({ where: { id: { startsWith: "demo_" } } });
    await tx.evalRun.deleteMany({
      where: { id: { in: [...DEMO_IDS.evalRuns] } },
    });
    await tx.workflowMemory.deleteMany({
      where: { id: { startsWith: "demo_memory_" } },
    });
    await tx.document.deleteMany({
      where: {
        id: {
          in: [...DEMO_IDS.documents, ...legacyDemoDocumentIds],
        },
      },
    });
  });
}

export async function resetDemoData() {
  await removeDemoData();
}

export async function seedDemoData() {
  await removeDemoData();

  const now = new Date();
  const at = (minutesAgo: number) =>
    new Date(now.getTime() - minutesAgo * 60_000);

  await prisma.$transaction(
    async (tx) => {
      await tx.document.createMany({
        data: [
          {
            id: DEMO_IDS.documents[0],
            filename: "anika-rao-own-damage-claim.eml",
            mimeType: "text/plain",
            sizeBytes: 1372,
            contentText:
              "Anika Rao reports accidental rear-bumper damage to Hyundai i20 KA03MR4281 under policy POL-CF-2026-1001. Claim form, photographs and repair estimate are attached.",
            sourceType: "EMAIL_TEXT",
            contentHash: "demo-ready-v2",
            createdAt: at(20),
            updatedAt: at(15),
          },
          {
            id: DEMO_IDS.documents[1],
            filename: "kabir-mehta-theft-claim.eml",
            mimeType: "text/plain",
            sizeBytes: 1268,
            contentText:
              "Kabir Mehta reports theft of Honda City MH02EP7714 under policy POL-CF-2026-1002. FIR number and police report have not yet been provided.",
            sourceType: "EMAIL_TEXT",
            contentHash: "demo-waiting-v2",
            createdAt: at(60),
            updatedAt: at(53),
          },
          {
            id: DEMO_IDS.documents[2],
            filename: "sanya-kulkarni-theft-claim.eml",
            mimeType: "text/plain",
            sizeBytes: 1314,
            contentText:
              "Sanya Kulkarni reports theft of Tata Nexon KA05NK2094 under policy POL-CF-2026-1003. The initial email did not contain the FIR number or police report.",
            sourceType: "EMAIL_TEXT",
            contentHash: "demo-reopened-v2",
            createdAt: at(45),
            updatedAt: at(27),
          },
          {
            id: DEMO_IDS.documents[3],
            filename: "dev-malhotra-resolved-theft-claim.eml",
            mimeType: "text/plain",
            sizeBytes: 1422,
            contentText:
              "Dev Malhotra reports theft of Maruti Brezza DL08CZ6112 under policy POL-CF-2026-1004. Missing police information was requested, received and verified before approval.",
            sourceType: "EMAIL_TEXT",
            contentHash: "demo-resolved-v2",
            createdAt: at(180),
            updatedAt: at(155),
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
            rawModelOutput: readyClaim,
            extractedJson: readyClaim,
            validationJson: validationComplete,
            missingFieldsJson: [],
            confidenceJson: { overall: 0.94 },
            createdAt: at(20),
            updatedAt: at(15),
          },
          {
            id: DEMO_IDS.runs[1],
            documentId: DEMO_IDS.documents[1],
            status: "NEEDS_REVIEW",
            model: "gemini-2.5-flash",
            promptVersion: "claim-extraction-v3",
            schemaVersion: "auto_claim_v1",
            rawModelOutput: waitingClaim,
            extractedJson: waitingClaim,
            validationJson: validationMissingPoliceInformation,
            missingFieldsJson: ["police.firNumber"],
            confidenceJson: { overall: 0.91 },
            createdAt: at(60),
            updatedAt: at(53),
          },
          {
            id: DEMO_IDS.runs[2],
            documentId: DEMO_IDS.documents[2],
            status: "NEEDS_REVIEW",
            model: "gemini-2.5-flash",
            promptVersion: "claim-extraction-v3",
            schemaVersion: "auto_claim_v1",
            rawModelOutput: reopenedOriginalClaim,
            extractedJson: reopenedOriginalClaim,
            validationJson: validationMissingPoliceInformation,
            missingFieldsJson: ["police.firNumber"],
            confidenceJson: { overall: 0.9 },
            createdAt: at(45),
            updatedAt: at(27),
          },
          {
            id: DEMO_IDS.runs[3],
            documentId: DEMO_IDS.documents[3],
            status: "COMPLETED",
            model: "gemini-2.5-flash",
            promptVersion: "claim-extraction-v3",
            schemaVersion: "auto_claim_v1",
            rawModelOutput: resolvedOriginalClaim,
            extractedJson: resolvedOriginalClaim,
            validationJson: validationMissingPoliceInformation,
            missingFieldsJson: ["police.firNumber"],
            confidenceJson: { overall: 0.92 },
            createdAt: at(180),
            updatedAt: at(155),
          },
        ],
      });

      const events = [
        {
          id: "demo_ready_01",
          runId: DEMO_IDS.runs[0],
          type: "DOCUMENT_UPLOADED",
          message: "Claim email received.",
          createdAt: at(20),
        },
        {
          id: "demo_ready_02",
          runId: DEMO_IDS.runs[0],
          type: "EXTRACTION_STARTED",
          message: "Claim preparation started.",
          createdAt: at(19.8),
        },
        {
          id: "demo_ready_03",
          runId: DEMO_IDS.runs[0],
          type: "MODEL_RESPONSE_RECEIVED",
          message:
            "The extraction response was received through the AI gateway.",
          createdAt: at(19.4),
        },
        {
          id: "demo_ready_04",
          runId: DEMO_IDS.runs[0],
          type: "EXTRACTION_COMPLETED",
          message: "Claim facts were organized into the claim schema.",
          createdAt: at(19),
        },
        {
          id: "demo_ready_05",
          runId: DEMO_IDS.runs[0],
          type: "VALIDATION_STARTED",
          message: "Claim readiness checks started.",
          createdAt: at(18.8),
        },
        {
          id: "demo_ready_06",
          runId: DEMO_IDS.runs[0],
          type: "VALIDATION_COMPLETED",
          message: "All required fields and evidence were confirmed.",
          createdAt: at(18.5),
        },
        {
          id: "demo_ready_07",
          runId: DEMO_IDS.runs[0],
          type: "MEMORY_RETRIEVED",
          message:
            "Relevant workflow guidance from reviewed claims was retrieved.",
          createdAt: at(17.5),
        },
        {
          id: "demo_ready_08",
          runId: DEMO_IDS.runs[0],
          type: "AGENT_STEP_STARTED",
          message: "The guarded next-step assessment started.",
          createdAt: at(17),
        },
        {
          id: "demo_ready_09",
          runId: DEMO_IDS.runs[0],
          type: "AGENT_ACTION_PROPOSED",
          message: "ClaimFlow proposed preparing the claim for human review.",
          createdAt: at(16.8),
        },
        {
          id: "demo_ready_10",
          runId: DEMO_IDS.runs[0],
          type: "AGENT_TOOL_EXECUTED",
          message: "A guarded approval-note draft was prepared.",
          createdAt: at(16.5),
        },
        {
          id: "demo_ready_11",
          runId: DEMO_IDS.runs[0],
          type: "RUN_COMPLETED",
          message: "The prepared claim is ready for a human decision.",
          createdAt: at(15),
        },

        {
          id: "demo_waiting_01",
          runId: DEMO_IDS.runs[1],
          type: "DOCUMENT_UPLOADED",
          message: "Claim email received.",
          createdAt: at(60),
        },
        {
          id: "demo_waiting_02",
          runId: DEMO_IDS.runs[1],
          type: "EXTRACTION_STARTED",
          message: "Claim preparation started.",
          createdAt: at(59.5),
        },
        {
          id: "demo_waiting_03",
          runId: DEMO_IDS.runs[1],
          type: "EXTRACTION_COMPLETED",
          message: "Claim facts were organized into the claim schema.",
          createdAt: at(59),
        },
        {
          id: "demo_waiting_04",
          runId: DEMO_IDS.runs[1],
          type: "VALIDATION_STARTED",
          message: "Claim readiness checks started.",
          createdAt: at(58.5),
        },
        {
          id: "demo_waiting_05",
          runId: DEMO_IDS.runs[1],
          type: "MISSING_FIELDS_DETECTED",
          message: "The FIR number and police report are required.",
          metadata: requestReason,
          createdAt: at(58),
        },
        {
          id: "demo_waiting_06",
          runId: DEMO_IDS.runs[1],
          type: "VALIDATION_COMPLETED",
          message: "The claim needs additional police information.",
          createdAt: at(57.5),
        },
        {
          id: "demo_waiting_07",
          runId: DEMO_IDS.runs[1],
          type: "MEMORY_RETRIEVED",
          message: "A reviewed theft-claim workflow was retrieved as guidance.",
          createdAt: at(56.5),
        },
        {
          id: "demo_waiting_08",
          runId: DEMO_IDS.runs[1],
          type: "AGENT_STEP_STARTED",
          message: "The guarded next-step assessment started.",
          createdAt: at(56),
        },
        {
          id: "demo_waiting_09",
          runId: DEMO_IDS.runs[1],
          type: "AGENT_ACTION_PROPOSED",
          message: "ClaimFlow proposed an information request.",
          createdAt: at(55.8),
        },
        {
          id: "demo_waiting_10",
          runId: DEMO_IDS.runs[1],
          type: "AGENT_TOOL_EXECUTED",
          message: "A guarded information-request draft was created.",
          createdAt: at(55.5),
        },
        {
          id: "demo_waiting_11",
          runId: DEMO_IDS.runs[1],
          type: "FOLLOWUP_DRAFT_CREATED",
          message: "The FIR and police-report request was prepared.",
          createdAt: at(55.3),
        },
        {
          id: "demo_waiting_12",
          runId: DEMO_IDS.runs[1],
          type: "RUN_NEEDS_REVIEW",
          message: "Human review confirmed that more information is required.",
          createdAt: at(53),
        },

        {
          id: "demo_reopened_01",
          runId: DEMO_IDS.runs[2],
          type: "DOCUMENT_UPLOADED",
          message: "Claim email received.",
          createdAt: at(45),
        },
        {
          id: "demo_reopened_02",
          runId: DEMO_IDS.runs[2],
          type: "EXTRACTION_STARTED",
          message: "Claim preparation started.",
          createdAt: at(44.5),
        },
        {
          id: "demo_reopened_03",
          runId: DEMO_IDS.runs[2],
          type: "EXTRACTION_COMPLETED",
          message: "Claim facts were organized into the claim schema.",
          createdAt: at(44),
        },
        {
          id: "demo_reopened_04",
          runId: DEMO_IDS.runs[2],
          type: "VALIDATION_STARTED",
          message: "Claim readiness checks started.",
          createdAt: at(43.5),
        },
        {
          id: "demo_reopened_05",
          runId: DEMO_IDS.runs[2],
          type: "MISSING_FIELDS_DETECTED",
          message: "The FIR number and police report are required.",
          metadata: requestReason,
          createdAt: at(43),
        },
        {
          id: "demo_reopened_06",
          runId: DEMO_IDS.runs[2],
          type: "VALIDATION_COMPLETED",
          message: "The claim needs additional police information.",
          createdAt: at(42.5),
        },
        {
          id: "demo_reopened_07",
          runId: DEMO_IDS.runs[2],
          type: "MEMORY_RETRIEVED",
          message: "A reviewed theft-claim workflow was retrieved as guidance.",
          createdAt: at(41.5),
        },
        {
          id: "demo_reopened_08",
          runId: DEMO_IDS.runs[2],
          type: "AGENT_STEP_STARTED",
          message: "The guarded next-step assessment started.",
          createdAt: at(41),
        },
        {
          id: "demo_reopened_09",
          runId: DEMO_IDS.runs[2],
          type: "AGENT_TOOL_EXECUTED",
          message: "A guarded information-request draft was created.",
          createdAt: at(40.5),
        },
        {
          id: "demo_reopened_10",
          runId: DEMO_IDS.runs[2],
          type: "FOLLOWUP_DRAFT_CREATED",
          message: "The FIR and police-report request was prepared.",
          createdAt: at(40.3),
        },
        {
          id: "demo_reopened_11",
          runId: DEMO_IDS.runs[2],
          type: "RUN_NEEDS_REVIEW",
          message: "The review was paused for claimant information.",
          createdAt: at(38),
        },
        {
          id: "demo_reopened_12",
          runId: DEMO_IDS.runs[2],
          type: "ADDITIONAL_INFORMATION_RECEIVED",
          message:
            "FIR number and police report were received from the claimant.",
          metadata: {
            fieldValues: [
              {
                field: "police.firNumber",
                label: "FIR number",
                value: "FIR-028-001",
              },
            ],
            evidenceItems: [
              { label: "firNumber", note: "FIR number: FIR-028-001" },
              {
                label: "policeReport",
                note: "Police report received from the claimant.",
              },
            ],
            consistencyChecks: [
              {
                field: "police.firNumber",
                submittedValue: "FIR-028-001",
                evidenceLabels: ["firNumber"],
                status: "MATCHED",
              },
            ],
          },
          createdAt: at(28),
        },
        {
          id: "demo_reopened_13",
          runId: DEMO_IDS.runs[2],
          type: "REVIEW_REOPENED",
          message:
            "The claim returned to human review with the received information prefilled.",
          createdAt: at(27),
        },

        {
          id: "demo_resolved_01",
          runId: DEMO_IDS.runs[3],
          type: "DOCUMENT_UPLOADED",
          message: "Claim email received.",
          createdAt: at(180),
        },
        {
          id: "demo_resolved_02",
          runId: DEMO_IDS.runs[3],
          type: "EXTRACTION_STARTED",
          message: "Claim preparation started.",
          createdAt: at(179.5),
        },
        {
          id: "demo_resolved_03",
          runId: DEMO_IDS.runs[3],
          type: "MODEL_RESPONSE_RECEIVED",
          message:
            "The extraction response was received through the AI gateway.",
          createdAt: at(179),
        },
        {
          id: "demo_resolved_04",
          runId: DEMO_IDS.runs[3],
          type: "EXTRACTION_COMPLETED",
          message: "Claim facts were organized into the claim schema.",
          createdAt: at(178.5),
        },
        {
          id: "demo_resolved_05",
          runId: DEMO_IDS.runs[3],
          type: "VALIDATION_STARTED",
          message: "Claim readiness checks started.",
          createdAt: at(178),
        },
        {
          id: "demo_resolved_06",
          runId: DEMO_IDS.runs[3],
          type: "MISSING_FIELDS_DETECTED",
          message: "The FIR number and police report are required.",
          metadata: requestReason,
          createdAt: at(177.5),
        },
        {
          id: "demo_resolved_07",
          runId: DEMO_IDS.runs[3],
          type: "VALIDATION_COMPLETED",
          message: "The claim needs additional police information.",
          createdAt: at(177),
        },
        {
          id: "demo_resolved_08",
          runId: DEMO_IDS.runs[3],
          type: "MEMORY_RETRIEVED",
          message: "A reviewed theft-claim workflow was retrieved as guidance.",
          createdAt: at(176.5),
        },
        {
          id: "demo_resolved_09",
          runId: DEMO_IDS.runs[3],
          type: "AGENT_STEP_STARTED",
          message: "The guarded next-step assessment started.",
          createdAt: at(176),
        },
        {
          id: "demo_resolved_10",
          runId: DEMO_IDS.runs[3],
          type: "AGENT_TOOL_EXECUTED",
          message: "A guarded information-request draft was created.",
          createdAt: at(175.5),
        },
        {
          id: "demo_resolved_11",
          runId: DEMO_IDS.runs[3],
          type: "FOLLOWUP_DRAFT_CREATED",
          message: "The FIR and police-report request was prepared.",
          createdAt: at(175.3),
        },
        {
          id: "demo_resolved_12",
          runId: DEMO_IDS.runs[3],
          type: "RUN_NEEDS_REVIEW",
          message: "The review was paused for claimant information.",
          createdAt: at(174),
        },
        {
          id: "demo_resolved_13",
          runId: DEMO_IDS.runs[3],
          type: "ADDITIONAL_INFORMATION_RECEIVED",
          message:
            "FIR number and police report were received from the claimant.",
          metadata: {
            fieldValues: [
              {
                field: "police.firNumber",
                label: "FIR number",
                value: "FIR-DL-2026-4187",
              },
            ],
            evidenceItems: [
              { label: "firNumber", note: "FIR number: FIR-DL-2026-4187" },
              {
                label: "policeReport",
                note: "Police report received and verified.",
              },
            ],
            consistencyChecks: [
              {
                field: "police.firNumber",
                submittedValue: "FIR-DL-2026-4187",
                evidenceLabels: ["firNumber"],
                status: "MATCHED",
              },
            ],
          },
          createdAt: at(165),
        },
        {
          id: "demo_resolved_14",
          runId: DEMO_IDS.runs[3],
          type: "REVIEW_REOPENED",
          message:
            "The claim returned to human review with received information prefilled.",
          createdAt: at(164),
        },
        {
          id: "demo_resolved_15",
          runId: DEMO_IDS.runs[3],
          type: "MEMORY_FEEDBACK_RECORDED",
          message:
            "The reviewer marked the retrieved workflow memory as useful.",
          metadata: { memoryId: DEMO_IDS.memories[0], feedback: "USEFUL" },
          createdAt: at(158),
        },
        {
          id: "demo_resolved_16",
          runId: DEMO_IDS.runs[3],
          type: "RUN_COMPLETED",
          message:
            "The reviewer corrected the claim and approved the final decision.",
          createdAt: at(155),
        },
      ] as const;

      await tx.extractionEvent.createMany({ data: [...events] });

      await tx.reviewTask.createMany({
        data: [
          {
            id: "demo_task_ready",
            runId: DEMO_IDS.runs[0],
            status: "PENDING",
            priority: "NORMAL",
            reasonJson: {
              missingFields: [],
              conflicts: [],
              warnings: [],
              requiredEvidence: [],
              recommendation:
                "Review the prepared claim and make the final decision.",
            },
            createdAt: at(15),
            updatedAt: at(15),
          },
          {
            id: "demo_task_waiting",
            runId: DEMO_IDS.runs[1],
            status: "NEEDS_MORE_INFO",
            priority: "HIGH",
            reasonJson: requestReason,
            startedAt: at(54),
            createdAt: at(57),
            updatedAt: at(53),
          },
          {
            id: "demo_task_reopened",
            runId: DEMO_IDS.runs[2],
            status: "PENDING",
            priority: "NORMAL",
            reasonJson: requestReason,
            startedAt: at(39),
            createdAt: at(42),
            updatedAt: at(27),
          },
          {
            id: "demo_task_resolved",
            runId: DEMO_IDS.runs[3],
            status: "EDITED_AND_APPROVED",
            priority: "NORMAL",
            reasonJson: requestReason,
            assignedTo: "Demo Reviewer",
            startedAt: at(174),
            completedAt: at(155),
            createdAt: at(177),
            updatedAt: at(155),
          },
        ],
      });

      await tx.reviewDecision.createMany({
        data: [
          {
            id: "demo_decision_waiting_request",
            taskId: "demo_task_waiting",
            decision: "REQUEST_MORE_INFO",
            notes: "Please provide the FIR number and police report.",
            reviewerName: "Demo Reviewer",
            createdAt: at(53),
          },
          {
            id: "demo_decision_reopened_request",
            taskId: "demo_task_reopened",
            decision: "REQUEST_MORE_INFO",
            notes: "Please provide the FIR number and police report.",
            reviewerName: "Demo Reviewer",
            createdAt: at(38),
          },
          {
            id: "demo_decision_resolved_request",
            taskId: "demo_task_resolved",
            decision: "REQUEST_MORE_INFO",
            notes: "Please provide the FIR number and police report.",
            reviewerName: "Demo Reviewer",
            createdAt: at(174),
          },
          {
            id: "demo_decision_resolved_approved",
            taskId: "demo_task_resolved",
            decision: "EDIT_AND_APPROVE",
            correctedJson: resolvedCorrectedClaim,
            correctedValidationJson: validationComplete,
            notes:
              "FIR and police report verified. Claim corrected and approved.",
            reviewerName: "Demo Reviewer",
            createdAt: at(155),
          },
        ],
      });

      await tx.reviewEvent.createMany({
        data: [
          {
            id: "demo_review_waiting_01",
            taskId: "demo_task_waiting",
            type: "REVIEW_TASK_CREATED",
            message: "Review task created from validation findings.",
            createdAt: at(57),
          },
          {
            id: "demo_review_waiting_02",
            taskId: "demo_task_waiting",
            type: "REVIEW_STARTED",
            message: "Demo Reviewer started the review.",
            createdAt: at(54),
          },
          {
            id: "demo_review_waiting_03",
            taskId: "demo_task_waiting",
            type: "REVIEW_MORE_INFO_REQUESTED",
            message: "FIR number and police report requested.",
            createdAt: at(53),
          },
          {
            id: "demo_review_reopened_01",
            taskId: "demo_task_reopened",
            type: "REVIEW_TASK_CREATED",
            message: "Review task created from validation findings.",
            createdAt: at(42),
          },
          {
            id: "demo_review_reopened_02",
            taskId: "demo_task_reopened",
            type: "REVIEW_STARTED",
            message: "Demo Reviewer started the review.",
            createdAt: at(39),
          },
          {
            id: "demo_review_reopened_03",
            taskId: "demo_task_reopened",
            type: "REVIEW_MORE_INFO_REQUESTED",
            message: "FIR number and police report requested.",
            createdAt: at(38),
          },
          {
            id: "demo_review_resolved_01",
            taskId: "demo_task_resolved",
            type: "REVIEW_TASK_CREATED",
            message: "Review task created from validation findings.",
            createdAt: at(177),
          },
          {
            id: "demo_review_resolved_02",
            taskId: "demo_task_resolved",
            type: "REVIEW_STARTED",
            message: "Demo Reviewer started the review.",
            createdAt: at(174.5),
          },
          {
            id: "demo_review_resolved_03",
            taskId: "demo_task_resolved",
            type: "REVIEW_MORE_INFO_REQUESTED",
            message: "FIR number and police report requested.",
            createdAt: at(174),
          },
          {
            id: "demo_review_resolved_04",
            taskId: "demo_task_resolved",
            type: "REVIEW_EDITED_AND_APPROVED",
            message:
              "Demo Reviewer verified the received evidence, corrected the claim and approved it.",
            createdAt: at(155),
          },
        ],
      });

      await tx.followupDraft.createMany({
        data: [
          {
            id: "demo_followup_waiting",
            runId: DEMO_IDS.runs[1],
            requestType: "MIXED_INFO_REQUEST",
            subject: "Police information required for CLM-DEMO-1002",
            body: "Please reply with the FIR number and attach the police report.",
            requestedEvidence: ["firNumber", "policeReport"],
            requestedFields: ["police.firNumber"],
            fieldRequests: [
              {
                field: "police.firNumber",
                label: "FIR number",
                question: "Please provide the FIR number.",
                acceptedEvidence: ["firCopy", "policeReport"],
              },
            ],
            status: "DRAFTED",
            createdAt: at(55.3),
            updatedAt: at(53),
          },
          {
            id: "demo_followup_reopened",
            runId: DEMO_IDS.runs[2],
            requestType: "MIXED_INFO_REQUEST",
            subject: "Police information required for CLM-DEMO-1003",
            body: "Please reply with the FIR number and attach the police report.",
            requestedEvidence: ["firNumber", "policeReport"],
            requestedFields: ["police.firNumber"],
            fieldRequests: [
              {
                field: "police.firNumber",
                label: "FIR number",
                question: "Please provide the FIR number.",
                acceptedEvidence: ["firCopy", "policeReport"],
              },
            ],
            status: "INFO_RECEIVED",
            createdAt: at(40.3),
            updatedAt: at(28),
          },
          {
            id: "demo_followup_resolved",
            runId: DEMO_IDS.runs[3],
            requestType: "MIXED_INFO_REQUEST",
            subject: "Police information required for CLM-DEMO-1004",
            body: "Please reply with the FIR number and attach the police report.",
            requestedEvidence: ["firNumber", "policeReport"],
            requestedFields: ["police.firNumber"],
            fieldRequests: [
              {
                field: "police.firNumber",
                label: "FIR number",
                question: "Please provide the FIR number.",
                acceptedEvidence: ["firCopy", "policeReport"],
              },
            ],
            status: "INFO_RECEIVED",
            createdAt: at(175.3),
            updatedAt: at(165),
          },
        ],
      });

      await tx.workflowMemory.createMany({
        data: [
          {
            id: DEMO_IDS.memories[0],
            kind: "PRIOR_REVIEW_DECISION",
            status: "STRENGTHENED",
            riskLevel: "LOW",
            confidence: 0.88,
            summary:
              "A theft claim with a missing FIR number and police report was paused, the information was requested, and a reviewer approved only after verifying the received evidence.",
            safeUse:
              "Use this only to suggest the workflow checks that may be repeated. Verify all current-claim facts and documents independently.",
            mustNotDo: [
              "Do not copy an FIR number from another claim.",
              "Do not treat memory as claim evidence.",
              "Do not make the final decision from memory.",
            ],
            entityType: "CLAIM_WORKFLOW",
            entityId: "motor:theft:missing-fir:missing-police-report",
            fieldPath: "police.firNumber",
            tags: [
              "motor",
              "theft",
              "missing-information",
              "fir",
              "police-report",
            ],
            confirmedCount: 4,
            lastUsedAt: at(17.5),
            createdAt: at(300),
            updatedAt: at(17.5),
          },
          {
            id: DEMO_IDS.memories[1],
            kind: "PRIOR_REVIEW_DECISION",
            status: "ACTIVE",
            riskLevel: "LOW",
            confidence: 0.82,
            summary:
              "A human reviewer completed a theft claim after the submitted FIR and police report were verified and the claim record was corrected.",
            safeUse:
              "Use only as workflow guidance for similar missing-information patterns.",
            mustNotDo: [
              "Do not reuse facts from the resolved claim.",
              "Do not infer coverage or approval.",
            ],
            entityType: "CLAIM_WORKFLOW",
            entityId: "motor:theft:resolved-after-information",
            fieldPath: "police.firNumber",
            tags: ["motor", "theft", "resolved", "human-reviewed"],
            evidenceJson: {
              claimType: "motor",
              lossType: "theft",
              validationPattern: ["police.firNumber", "policeReport"],
              outcome: "EDITED_AND_APPROVED",
            },
            sourceRunId: DEMO_IDS.runs[3],
            sourceReviewDecisionId: "demo_decision_resolved_approved",
            confirmedCount: 1,
            createdAt: at(154),
            updatedAt: at(154),
          },
        ],
      });

      await tx.agentActionLog.createMany({
        data: [
          {
            id: "demo_action_ready",
            runId: DEMO_IDS.runs[0],
            action: "DRAFT_APPROVAL_NOTE",
            status: "EXECUTED",
            rationale:
              "Validation is complete. Prepare a review note without making the final decision.",
            guardrailDecision: "ALLOWED",
            toolName: "draftApprovalNote",
            toolInputJson: { runId: DEMO_IDS.runs[0] },
            toolOutputJson: {
              summary:
                "Claim facts and supporting evidence are ready for reviewer verification.",
            },
            createdAt: at(16.5),
          },
          {
            id: "demo_action_waiting",
            runId: DEMO_IDS.runs[1],
            action: "DRAFT_INFORMATION_REQUEST",
            status: "EXECUTED",
            rationale:
              "Theft claims require the current FIR number and police report before approval.",
            guardrailDecision: "ALLOWED",
            toolName: "draftInformationRequest",
            toolInputJson: {
              fields: ["police.firNumber"],
              evidence: ["policeReport"],
            },
            toolOutputJson: { followupDraftId: "demo_followup_waiting" },
            createdAt: at(55.5),
          },
          {
            id: "demo_action_reopened",
            runId: DEMO_IDS.runs[2],
            action: "DRAFT_INFORMATION_REQUEST",
            status: "EXECUTED",
            rationale:
              "Theft claims require the current FIR number and police report before approval.",
            guardrailDecision: "ALLOWED",
            toolName: "draftInformationRequest",
            toolInputJson: {
              fields: ["police.firNumber"],
              evidence: ["policeReport"],
            },
            toolOutputJson: { followupDraftId: "demo_followup_reopened" },
            createdAt: at(40.5),
          },
          {
            id: "demo_action_resolved",
            runId: DEMO_IDS.runs[3],
            action: "DRAFT_INFORMATION_REQUEST",
            status: "EXECUTED",
            rationale:
              "Theft claims require the current FIR number and police report before approval.",
            guardrailDecision: "ALLOWED",
            toolName: "draftInformationRequest",
            toolInputJson: {
              fields: ["police.firNumber"],
              evidence: ["policeReport"],
            },
            toolOutputJson: { followupDraftId: "demo_followup_resolved" },
            createdAt: at(175.5),
          },
        ],
      });

      await tx.memoryHit.createMany({
        data: [
          {
            id: "demo_hit_ready",
            memoryId: DEMO_IDS.memories[0],
            runId: DEMO_IDS.runs[0],
            score: 62,
            matchedOn: ["claimType"],
            retrievalReason: "General motor-claim workflow guidance.",
            usedByAgent: false,
            createdAt: at(17.5),
          },
          {
            id: "demo_hit_waiting",
            memoryId: DEMO_IDS.memories[0],
            runId: DEMO_IDS.runs[1],
            score: 96,
            matchedOn: [
              "claimType",
              "lossType",
              "validationPattern",
              "evidenceProfile",
            ],
            retrievalReason:
              "Theft claim with the same missing FIR and police-report workflow pattern.",
            usedByAgent: true,
            agentActionLogId: "demo_action_waiting",
            createdAt: at(56.5),
          },
          {
            id: "demo_hit_reopened",
            memoryId: DEMO_IDS.memories[0],
            runId: DEMO_IDS.runs[2],
            score: 96,
            matchedOn: [
              "claimType",
              "lossType",
              "validationPattern",
              "evidenceProfile",
            ],
            retrievalReason:
              "Theft claim with the same missing FIR and police-report workflow pattern.",
            usedByAgent: true,
            agentActionLogId: "demo_action_reopened",
            createdAt: at(41.5),
          },
          {
            id: "demo_hit_resolved",
            memoryId: DEMO_IDS.memories[0],
            runId: DEMO_IDS.runs[3],
            score: 95,
            matchedOn: [
              "claimType",
              "lossType",
              "validationPattern",
              "evidenceProfile",
            ],
            retrievalReason:
              "Theft claim with the same missing FIR and police-report workflow pattern.",
            usedByAgent: true,
            agentActionLogId: "demo_action_resolved",
            createdAt: at(176.5),
          },
        ],
      });

      await tx.memoryUpdate.createMany({
        data: [
          {
            id: "demo_memory_feedback_useful",
            memoryId: DEMO_IDS.memories[0],
            updateType: "FEEDBACK_RECORDED",
            runId: DEMO_IDS.runs[3],
            reviewDecisionId: "demo_decision_resolved_approved",
            beforeStatus: "ACTIVE",
            afterStatus: "STRENGTHENED",
            confidenceDelta: 0.05,
            note: "Reviewer marked the retrieved workflow pattern as useful.",
            metadata: { feedback: "USEFUL" },
            createdAt: at(158),
          },
          {
            id: "demo_memory_created_from_review",
            memoryId: DEMO_IDS.memories[1],
            updateType: "CREATED",
            runId: DEMO_IDS.runs[3],
            reviewDecisionId: "demo_decision_resolved_approved",
            afterStatus: "ACTIVE",
            note: "Safe workflow memory created from the completed human review.",
            createdAt: at(154),
          },
        ],
      });

      await tx.coverageQuestion.createMany({
        data: [
          {
            id: "demo_coverage_ready",
            runId: DEMO_IDS.runs[0],
            question: "Is accidental rear-bumper damage covered?",
            normalizedQuery:
              "motor own damage accidental collision rear bumper",
            retrievalStatus: "ENOUGH_EVIDENCE",
            retrievalJson: {
              clauses: [
                {
                  clauseId: "OD-1.1",
                  title: "Accidental external damage",
                  text: "The policy covers accidental external damage to the insured vehicle.",
                  score: 0.94,
                },
              ],
            },
            answerJson: {
              answer:
                "The reported accidental external damage is covered, subject to the policy deductible and final reviewer verification.",
              citations: ["OD-1.1"],
            },
            finalDecision: "COVERED",
            createdAt: at(17.8),
          },
          {
            id: "demo_coverage_reopened",
            runId: DEMO_IDS.runs[2],
            question: "What policy evidence applies to vehicle theft?",
            normalizedQuery: "motor theft coverage police report FIR",
            retrievalStatus: "ENOUGH_EVIDENCE",
            retrievalJson: {
              clauses: [
                {
                  clauseId: "TH-2.1",
                  title: "Vehicle theft",
                  text: "Theft is covered when reported to police and supported by the required claim documents.",
                  score: 0.96,
                },
              ],
            },
            answerJson: {
              answer:
                "Theft may be covered when the current FIR and police report are verified. A reviewer must make the final claim decision.",
              citations: ["TH-2.1"],
            },
            finalDecision: "NEEDS_REVIEW",
            createdAt: at(29),
          },
        ],
      });

      const aiRuns = [
        ["ready", DEMO_IDS.runs[0], at(19), 842],
        ["waiting", DEMO_IDS.runs[1], at(59), 911],
        ["reopened", DEMO_IDS.runs[2], at(44), 876],
        ["resolved", DEMO_IDS.runs[3], at(178.5), 893],
      ] as const;

      await tx.aiCallLog.createMany({
        data: aiRuns.flatMap(([label, runId, createdAt, latencyMs]) => [
          {
            id: `demo_ai_${label}_extraction`,
            traceId: `trace_demo_${label}`,
            runId,
            kind: "EXTRACTION" as const,
            status: "SUCCEEDED" as const,
            provider: "google",
            model: "gemini-2.5-flash",
            modelVersion: "gemini-2.5-flash-2026-05",
            promptVersion: "claim-extraction-v3",
            schemaVersion: "auto_claim_v1",
            latencyMs,
            totalTokens: 1480,
            estimatedCostUsd: 0.0017,
            createdAt,
            updatedAt: createdAt,
          },
          {
            id: `demo_ai_${label}_agent`,
            traceId: `trace_demo_${label}`,
            runId,
            kind: "AGENT_PLANNER" as const,
            status: "SUCCEEDED" as const,
            provider: "google",
            model: "gemini-2.5-flash",
            modelVersion: "gemini-2.5-flash-2026-05",
            promptVersion: "guarded-agent-v2",
            schemaVersion: "agent_action_v1",
            latencyMs: 524,
            totalTokens: 680,
            estimatedCostUsd: 0.0008,
            createdAt: new Date(createdAt.getTime() + 60_000),
            updatedAt: new Date(createdAt.getTime() + 60_000),
          },
        ]),
      });

      const evals = [
        [
          DEMO_IDS.evalRuns[0],
          "WEEK1_EXTRACTION",
          "Extraction quality",
          12,
          12,
          0,
          0,
          { schema_valid_rate: 1, exact_field_accuracy: 0.96 },
        ],
        [
          DEMO_IDS.evalRuns[1],
          "WEEK2_REVIEW",
          "Human review workflow",
          10,
          10,
          0,
          0,
          { correct_routing_rate: 1 },
        ],
        [
          DEMO_IDS.evalRuns[2],
          "WEEK3_RAG",
          "Policy-grounded guidance",
          12,
          11,
          0,
          1,
          { citation_precision: 0.94, abstention_accuracy: 1 },
        ],
        [
          DEMO_IDS.evalRuns[3],
          "WEEK4_AGENT",
          "Guarded agent actions",
          14,
          14,
          0,
          0,
          { guardrail_enforcement_rate: 1, correct_action_rate: 0.93 },
        ],
        [
          DEMO_IDS.evalRuns[4],
          "WEEK5_MEMORY",
          "Safe workflow memory",
          12,
          12,
          0,
          0,
          { relevant_retrieval_rate: 0.92, unsafe_autofill_rate: 0 },
        ],
        [
          DEMO_IDS.evalRuns[5],
          "WEEK6_GATEWAY_OBSERVABILITY",
          "Traceability and reliability",
          9,
          9,
          0,
          0,
          {
            eval_pass_rate: 1,
            latency_p95: 911,
            model_error_rate: 0,
            missing_trace_rate: 0,
            cost_per_run: 0.0011,
          },
        ],
      ] as const;

      for (const [
        id,
        suite,
        label,
        total,
        passed,
        failed,
        warnings,
        metrics,
      ] of evals) {
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
            metadataJson: {
              source: "claimflow-product-demo",
              deterministic: true,
            },
            createdAt: at(12 - evals.findIndex((entry) => entry[0] === id)),
            cases: {
              create: Array.from({ length: total }, (_, index) => ({
                id: `${id}_case_${index + 1}`,
                caseId: `${String(suite).toLowerCase()}-${String(index + 1).padStart(3, "0")}`,
                status:
                  index < passed
                    ? "PASSED"
                    : failed > 0 && index < passed + failed
                      ? "FAILED"
                      : "WARNING",
                score: index < passed ? 1 : 0.75,
                metadataJson: { seeded: true },
              })),
            },
          },
        });
      }
    },
    { timeout: 30_000 },
  );

  return {
    runIds: [...DEMO_IDS.runs],
    evalRunIds: [...DEMO_IDS.evalRuns],
    seededAt: now.toISOString(),
  };
}

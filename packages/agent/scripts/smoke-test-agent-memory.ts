import assert from "node:assert/strict";
import { prisma, type Prisma } from "@repo/db";
import { loadWeek5MemorySeed } from "@repo/memory";
import { buildAgentContext } from "../planner/build-agent-context";
import { runAgentStep } from "../runner/run-agent-step";
import type { ClaimStateForAgent } from "@repo/shared/schemas";

type ExpectedAction = "DRAFT_INFORMATION_REQUEST" | "ESCALATE_TO_HUMAN";

type SmokeCoverageQuestionData = {
  question: string;
  normalizedQuery?: string | null;
  retrievalStatus: "ENOUGH_EVIDENCE" | "INSUFFICIENT_EVIDENCE";
  finalDecision: "COVERED" | "NOT_COVERED" | "PARTIALLY_COVERED" | "NEEDS_REVIEW";
  retrievalJson?: unknown;
  answerJson?: unknown;
};

type SmokeRunData = {
  status:
    | "UPLOADED"
    | "EXTRACTING"
    | "VALIDATING"
    | "COMPLETED"
    | "NEEDS_REVIEW"
    | "FAILED";
  extractedJson: unknown;
  validationJson: unknown;
  missingFieldsJson: unknown;
  coverageQuestion?: SmokeCoverageQuestionData;
};

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function section(title: string) {
  console.log("");
  console.log("=".repeat(80));
  console.log(title);
  console.log("=".repeat(80));
}

function oneLineMemorySummary(context: ClaimStateForAgent): string {
  if (context.relevantMemories.length === 0) {
    return "No relevant memory retrieved.";
  }

  return context.relevantMemories
    .slice(0, 3)
    .map((memory) => {
      const matchedOn = memory.matchedOn.map((signal) => signal.type).join(", ");

      return `${memory.kind}/${memory.riskLevel}: ${memory.summary} [matchedOn: ${matchedOn}]`;
    })
    .join("\n  ");
}

async function assertMemoryWasAudited(runId: string) {
  const count = await prisma.memoryHit.count({
    where: {
      runId,
      usedByAgent: true,
      agentActionLogId: {
        not: null,
      },
    },
  });

  assert(
    count > 0,
    "Expected MemoryHit.usedByAgent=true and linked AgentActionLog.",
  );
}

async function createSmokeDocument(label: string) {
  return prisma.document.create({
    data: {
      filename: `${label}.json`,
      mimeType: "application/json",
      sizeBytes: 1,
      sourceType: "EMAIL_TEXT",
      contentText: label,
    },
  });
}

async function runScenario(input: {
  title: string;
  claimStory: string;
  expectedMemoryStory: string;
  expectedAction: ExpectedAction;
  why: string;
  runData: SmokeRunData;
  assertMemory: (context: ClaimStateForAgent) => void;
}) {
  section(input.title);

  const document = await createSmokeDocument(
    input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  );

  try {
    const run = await prisma.extractionRun.create({
      data: {
        documentId: document.id,
        status: input.runData.status,
        extractedJson: toPrismaJson(input.runData.extractedJson),
        validationJson: toPrismaJson(input.runData.validationJson),
        missingFieldsJson: toPrismaJson(input.runData.missingFieldsJson),
      },
    });

    if (input.runData.coverageQuestion) {
      await prisma.coverageQuestion.create({
        data: {
          runId: run.id,
          question: input.runData.coverageQuestion.question,
          normalizedQuery: input.runData.coverageQuestion.normalizedQuery ?? null,
          retrievalStatus: input.runData.coverageQuestion.retrievalStatus,
          finalDecision: input.runData.coverageQuestion.finalDecision,
          retrievalJson: toPrismaJson(
            input.runData.coverageQuestion.retrievalJson ?? {},
          ),
          answerJson: toPrismaJson(input.runData.coverageQuestion.answerJson ?? {}),
        },
      });
    }

    const context = await buildAgentContext(run.id);

    console.log("Claim:");
    console.log(`  ${input.claimStory}`);

    console.log("");
    console.log("Memory expected:");
    console.log(`  ${input.expectedMemoryStory}`);

    console.log("");
    console.log("Memory retrieved:");
    console.log(`  ${oneLineMemorySummary(context)}`);

    input.assertMemory(context);

    const result = await runAgentStep(run.id);

    console.log("");
    console.log("Agent action:");
    console.log(`  ${result.proposedAction.action}`);

    console.log("");
    console.log("Why:");
    console.log(`  ${input.why}`);

    assert.equal(
      result.proposedAction.action,
      input.expectedAction,
      `Expected ${input.expectedAction}, got ${result.proposedAction.action}`,
    );

    assert.equal(result.guardrail.decision, "ALLOWED");

    await assertMemoryWasAudited(run.id);

    console.log("");
    console.log("Result: PASS");
  } finally {
    await prisma.document
      .delete({
        where: {
          id: document.id,
        },
      })
      .catch(() => undefined);
  }
}

async function ensureVehicleRegistrationProblemMemory() {
  const existing = await prisma.workflowMemory.findFirst({
    where: {
      kind: "RECURRING_ERROR_PATTERN",
      entityType: "FIELD_PATH",
      entityId: "vehicleRegistrationNumber",
      fieldPath: "vehicleRegistrationNumber",
      summary:
        "Claims missing vehicleRegistrationNumber were previously resolved by drafting an information request.",
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.workflowMemory.create({
    data: {
      kind: "RECURRING_ERROR_PATTERN",
      status: "ACTIVE",
      riskLevel: "MEDIUM",
      confidence: 0.72,
      summary:
        "Claims missing vehicleRegistrationNumber were previously resolved by drafting an information request.",
      safeUse:
        "When vehicleRegistrationNumber is currently missing, draft an information request for vehicle registration details or document.",
      mustNotDo: toPrismaJson([
        "approve because another claim with this issue was approved",
        "copy vehicle registration number from an old claim",
        "treat prior approval as current claim evidence",
      ]),
      entityType: "FIELD_PATH",
      entityId: "vehicleRegistrationNumber",
      fieldPath: "vehicleRegistrationNumber",
      tags: toPrismaJson([
        "missing_field:vehicle_registration_number",
        "vehicle_registration_number_missing",
        "vehicle_registration_required",
        "structured_info_request",
        "prior_resolution_info_request",
      ]),
      evidenceJson: toPrismaJson({
        memorySeedId: "WMEM-SMOKE-W5-VEHICLE-REG-001",
        source: "week5-day5-smoke-test",
        priorOutcome: "resolved_after_information_request",
        priorFinalOutcome: "approved_after_current_evidence_completed",
        lesson:
          "Transfer the workflow step, not the old approval outcome.",
      }),
      confirmedCount: 1,
      contradictedCount: 0,
    },
  });
}

async function main() {
  section("Week 5 Day 5 agent memory smoke test");

  const seedResult = await loadWeek5MemorySeed({
    log: false,
  });

  await ensureVehicleRegistrationProblemMemory();
  console.log(`Loaded memory seeds: ${seedResult.total}`);

  await runScenario({
    title: "SCENARIO 1 — Same claimant missing policy number",
    claimStory:
      "Dev Arora submitted an own_damage claim, but policyNumber is missing.",
    expectedMemoryStory:
      "Prior human correction memory says policyNumber was previously corrected for this same claimant.",
    expectedAction: "DRAFT_INFORMATION_REQUEST",
    why:
      "Current required field is missing, so the agent asks for information. Memory only tells the reviewer to verify policyNumber; it does not auto-fill it.",
    runData: {
      status: "NEEDS_REVIEW",
      extractedJson: {
        customerId: "CUST-W5-001",
        claimNumber: "CLM-W5-D5-001",
        insuredName: "Dev Arora",
        policyNumber: null,
        lossType: "own_damage",
      },
      validationJson: {
        isValid: false,
        missingFields: ["policyNumber"],
        requiredEvidence: [],
        conflicts: [],
      },
      missingFieldsJson: ["policyNumber"],
    },
    assertMemory(context) {
      assert(
        context.relevantMemories.some(
          (memory) =>
            memory.kind === "HUMAN_CORRECTION" &&
            memory.entityType === "CLAIMANT" &&
            memory.entityId === "CUST-W5-001" &&
            memory.fieldPath === "policyNumber",
        ),
        "Expected same-claimant policyNumber HUMAN_CORRECTION memory.",
      );
    },
  });

    await runScenario({
    title: "SCENARIO 2 — Different claimant, same problem resolved before",
    claimStory:
        "Karan Malhotra submitted an own_damage claim. Current issue: vehicleRegistrationNumber is missing.",
    expectedMemoryStory:
        "A previous claim with the same missing vehicleRegistrationNumber problem was resolved by drafting an information request.",
    expectedAction: "DRAFT_INFORMATION_REQUEST",
    why:
        "Memory transfers the workflow lesson: ask for the missing vehicle registration detail. It does not transfer the old claim's approval outcome.",
    runData: {
        status: "NEEDS_REVIEW",
        extractedJson: {
        customerId: "CUST-W5-999",
        claimNumber: "CLM-W5-D5-002",
        insuredName: "Karan Malhotra",
        policyNumber: "POL-W5-999",
        vehicleRegistrationNumber: null,
        incidentDate: "2026-04-17",
        lossType: "own_damage",
        },
        validationJson: {
        isValid: false,
        missingFields: ["vehicleRegistrationNumber"],
        requiredEvidence: [],
        conflicts: [],
        },
        missingFieldsJson: ["vehicleRegistrationNumber"],
    },
    assertMemory(context) {
        assert(
        context.relevantMemories.some(
            (memory) =>
            memory.kind === "RECURRING_ERROR_PATTERN" &&
            memory.entityType === "FIELD_PATH" &&
            memory.entityId === "vehicleRegistrationNumber" &&
            memory.fieldPath === "vehicleRegistrationNumber",
        ),
        "Expected reusable vehicleRegistrationNumber problem memory.",
        );

        assert(
        !context.relevantMemories.some(
            (memory) =>
            memory.kind === "HUMAN_CORRECTION" &&
            memory.entityType === "CLAIMANT" &&
            memory.entityId === "CUST-W5-001",
        ),
        "Should not retrieve another claimant's claimant-specific correction memory.",
        );
    },
    });

  await runScenario({
    title: "SCENARIO 3 — Different claimant same required evidence issue",
    claimStory:
      "Rohan Sen submitted a third-party claim under POLICY-W5-002, but policeReport evidence is missing.",
    expectedMemoryStory:
      "Prior review memory says third-party claims under this policy required policeReport before continuing.",
    expectedAction: "DRAFT_INFORMATION_REQUEST",
    why:
      "The claimant is different, but the same policy/evidence issue applies. Agent asks for policeReport; memory supports the workflow but does not mark evidence missing by itself.",
    runData: {
      status: "NEEDS_REVIEW",
      extractedJson: {
        customerId: "CUST-W5-010",
        claimNumber: "CLM-W5-D5-003",
        insuredName: "Rohan Sen",
        policyId: "POLICY-W5-002",
        policyNumber: "POL-W5-002",
        lossType: "third_party",
      },
      validationJson: {
        isValid: false,
        missingFields: [],
        requiredEvidence: ["policeReport"],
        conflicts: [],
      },
      missingFieldsJson: [],
    },
    assertMemory(context) {
      assert(
        context.relevantMemories.some(
          (memory) =>
            memory.kind === "PRIOR_REVIEW_DECISION" &&
            memory.entityType === "POLICY" &&
            memory.entityId === "POLICY-W5-002" &&
            memory.fieldPath === "requiredEvidence.policeReport",
        ),
        "Expected policy-scoped policeReport PRIOR_REVIEW_DECISION memory.",
      );
    },
  });

  await runScenario({
    title: "SCENARIO 4 — Complete claim but prior rejection memory",
    claimStory:
      "Asha Mehra submitted a complete own_damage claim with no missing fields or evidence.",
    expectedMemoryStory:
      "High-risk prior rejection memory exists for the same claimant.",
    expectedAction: "ESCALATE_TO_HUMAN",
    why:
      "The claim is complete, but high-risk prior rejection memory should route to human review. The agent must not auto-reject or draft denial from memory.",
    runData: {
      status: "COMPLETED",
      extractedJson: {
        customerId: "CUST-W5-003",
        claimNumber: "CLM-W5-D5-004",
        insuredName: "Asha Mehra",
        policyNumber: "POL-W5-003",
        incidentDate: "2026-04-14",
        lossType: "own_damage",
        damageDescription: "Front bumper damage after parking lot impact.",
      },
      validationJson: {
        isValid: true,
        missingFields: [],
        requiredEvidence: [],
        conflicts: [],
      },
      missingFieldsJson: [],
    },
    assertMemory(context) {
      assert(
        context.relevantMemories.some(
          (memory) =>
            memory.kind === "PRIOR_REJECTION" &&
            memory.entityType === "CLAIMANT" &&
            memory.entityId === "CUST-W5-003" &&
            memory.riskLevel === "HIGH",
        ),
        "Expected HIGH PRIOR_REJECTION memory for same claimant.",
      );
    },
  });

  await runScenario({
    title: "SCENARIO 5 — Repair vendor has prior invoice conflict",
    claimStory:
      "Nikhil Rao submitted a complete claim using Metro Auto Works as repair vendor.",
    expectedMemoryStory:
      "High-risk vendor pattern memory says this vendor previously had invoice amount conflicts.",
    expectedAction: "ESCALATE_TO_HUMAN",
    why:
      "Vendor memory is not evidence for rejection, but it is a risk signal. The agent routes to human review instead of choosing an invoice amount automatically.",
    runData: {
      status: "COMPLETED",
      extractedJson: {
        customerId: "CUST-W5-020",
        claimNumber: "CLM-W5-D5-005",
        insuredName: "Nikhil Rao",
        policyNumber: "POL-W5-020",
        incidentDate: "2026-04-16",
        lossType: "own_damage",
        vendorId: "VEND-W5-001",
        repairVendor: {
          vendorId: "VEND-W5-001",
          name: "Metro Auto Works",
        },
        invoice: {
          vendorId: "VEND-W5-001",
          amount: 42000,
        },
      },
      validationJson: {
        isValid: true,
        missingFields: [],
        requiredEvidence: [],
        conflicts: [],
      },
      missingFieldsJson: [],
    },
    assertMemory(context) {
      assert(
        context.relevantMemories.some(
          (memory) =>
            memory.kind === "VENDOR_PATTERN" &&
            memory.entityType === "VENDOR" &&
            memory.entityId === "VEND-W5-001" &&
            memory.riskLevel === "HIGH",
        ),
        "Expected HIGH VENDOR_PATTERN memory for same vendor.",
      );
    },
  });

  await runScenario({
    title: "SCENARIO 6 — Covered claim but risky policy history memory",
    claimStory:
      "Meera Shah submitted a claim where current policy retrieval says COVERED, but high-risk policy history memory exists for the same policy.",
    expectedMemoryStory:
      "Policy history memory warns that insufficient/unsafe policy evidence should not lead to final decision drafting.",
    expectedAction: "ESCALATE_TO_HUMAN",
    why:
      "Even though current coverage looks positive, high-risk policy memory creates a safety conflict. Agent routes to review instead of drafting approval.",
    runData: {
      status: "COMPLETED",
      extractedJson: {
        customerId: "CUST-W5-030",
        claimNumber: "CLM-W5-D5-006",
        insuredName: "Meera Shah",
        policyId: "POLICY-W5-002",
        policyNumber: "POL-W5-002",
        incidentDate: "2026-04-18",
        lossType: "own_damage",
      },
      validationJson: {
        isValid: true,
        missingFields: [],
        requiredEvidence: [],
        conflicts: [],
      },
      missingFieldsJson: [],
      coverageQuestion: {
        question: "Is this claim covered?",
        normalizedQuery: "own damage coverage",
        retrievalStatus: "ENOUGH_EVIDENCE",
        finalDecision: "COVERED",
        retrievalJson: {
          citations: ["POLICY-W5-002 clause OD-1"],
        },
        answerJson: {
          answer: "Covered based on current policy evidence.",
        },
      },
    },
    assertMemory(context) {
      assert(
        context.relevantMemories.some(
          (memory) =>
            memory.kind === "POLICY_HISTORY" &&
            memory.entityType === "POLICY" &&
            memory.entityId === "POLICY-W5-002" &&
            memory.riskLevel === "HIGH",
        ),
        "Expected HIGH POLICY_HISTORY memory for same policy.",
      );
    },
  });

  section("Smoke test passed");

  console.log("Summary:");
  console.log("  Scenario 1: same claimant missing policyNumber → DRAFT_INFORMATION_REQUEST");
  console.log("  Scenario 2: different claimant same missing-field pattern → DRAFT_INFORMATION_REQUEST");
  console.log("  Scenario 3: different claimant same policeReport issue → DRAFT_INFORMATION_REQUEST");
  console.log("  Scenario 4: prior rejection memory → ESCALATE_TO_HUMAN");
  console.log("  Scenario 5: vendor risk memory → ESCALATE_TO_HUMAN");
  console.log("  Scenario 6: covered claim + risky policy memory → ESCALATE_TO_HUMAN");
  console.log("");
  console.log(
    "Memory was used for workflow routing and reviewer verification, not as source-of-truth evidence.",
  );
}

if (import.meta.main) {
  main()
    .catch((error) => {
      console.error("Week 5 Day 5 agent memory smoke test failed");
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
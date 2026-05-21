import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@repo/db";
import { retrievePolicyEvidence } from "../retrieval/retrieve-policy-evidence";
import { WEEK3_RETRIEVAL_SMOKE_CASES_PATH } from "../utils/paths";

type ExpectedStatus = "ENOUGH_EVIDENCE" | "INSUFFICIENT_EVIDENCE";

type RetrievalSmokeCase = {
  id: string;
  question: string;
  claimContext?: unknown;
  expectedStatus: ExpectedStatus;
  requiredTopClauses: string[];
  topKFinal?: number;
};

type CaseResult = {
  id: string;
  passed: boolean;
  status: string;
  expectedStatus: string;
  statusPass: boolean;
  clausePass: boolean;
  requiredClauses: string;
  retrievedClauses: string;
  topSimilarity: string;
  reason: string;
};

const CASES_PATH = WEEK3_RETRIEVAL_SMOKE_CASES_PATH;

function isRetrievalSmokeCase(value: unknown): value is RetrievalSmokeCase {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.id === "string" &&
    typeof item.question === "string" &&
    (item.expectedStatus === "ENOUGH_EVIDENCE" ||
      item.expectedStatus === "INSUFFICIENT_EVIDENCE") &&
    Array.isArray(item.requiredTopClauses) &&
    item.requiredTopClauses.every((clause) => typeof clause === "string") &&
    (item.topKFinal === undefined ||
      (typeof item.topKFinal === "number" &&
        Number.isInteger(item.topKFinal) &&
        item.topKFinal >= 1 &&
        item.topKFinal <= 20))
  );
}

async function loadCases(): Promise<RetrievalSmokeCase[]> {
  const raw = await readFile(CASES_PATH, "utf-8");
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error(`Expected ${CASES_PATH} to contain a JSON array.`);
  }

  const invalidIndex = parsed.findIndex((item) => !isRetrievalSmokeCase(item));

  if (invalidIndex >= 0) {
    throw new Error(`Invalid retrieval smoke case at index ${invalidIndex}.`);
  }

  return parsed;
}

function hasRequiredClauses(input: {
  retrievedClauses: string[];
  requiredClauses: string[];
}) {
  return input.requiredClauses.every((requiredClause) =>
    input.retrievedClauses.includes(requiredClause),
  );
}

async function runCase(testCase: RetrievalSmokeCase): Promise<CaseResult> {
  const result = await retrievePolicyEvidence({
    question: testCase.question,
    claimContext: testCase.claimContext,
    topKFinal: testCase.topKFinal ?? 5,
  });

  const retrievedClauses = result.matches
    .map((match) => match.clauseId)
    .filter((clauseId): clauseId is string => Boolean(clauseId));

  const statusPass = result.retrievalStatus === testCase.expectedStatus;

  const clausePass = hasRequiredClauses({
    retrievedClauses,
    requiredClauses: testCase.requiredTopClauses,
  });

  const passed = statusPass && clausePass;

  const topSimilarity = result.matches[0]?.similarity;

  return {
    id: testCase.id,
    passed,
    status: result.retrievalStatus,
    expectedStatus: testCase.expectedStatus,
    statusPass,
    clausePass,
    requiredClauses: testCase.requiredTopClauses.join(", ") || "-",
    retrievedClauses: retrievedClauses.slice(0, 5).join(", ") || "-",
    topSimilarity:
      typeof topSimilarity === "number" ? topSimilarity.toFixed(4) : "-",
    reason: result.reason,
  };
}

async function main() {
  const cases = await loadCases();

  console.log("");
  console.log("========================================");
  console.log("Week 3 Retrieval Smoke Cases");
  console.log("========================================");
  console.log(`Cases file: ${CASES_PATH}`);
  console.log(`Total cases: ${cases.length}`);
  console.log("");

  const results: CaseResult[] = [];

  for (const testCase of cases) {
    console.log(`Running: ${testCase.id}`);

    const result = await runCase(testCase);
    results.push(result);
  }

  console.log("");
  console.log("Results:");
  console.log("========================================");

  for (const result of results) {
  const icon = result.passed ? "✅" : "❌";

  console.log(`${icon} ${result.id}`);
  console.log(`   Status: ${result.status} / expected ${result.expectedStatus}`);
  console.log(`   Status pass: ${result.statusPass}`);
  console.log(`   Clause pass: ${result.clausePass}`);
  console.log(`   Required: ${result.requiredClauses}`);
  console.log(`   Retrieved: ${result.retrievedClauses}`);
  console.log(`   Top similarity: ${result.topSimilarity}`);
  console.log("");
  }

  const failed = results.filter((result) => !result.passed);

  console.log("");
  console.log(`Passed: ${results.length - failed.length}/${results.length}`);

  if (failed.length > 0) {
    console.log("");
    console.log("Failed cases:");
    console.log("========================================");

    for (const result of failed) {
        console.log(`❌ ${result.id}`);
        console.log(`   expectedStatus: ${result.expectedStatus}`);
        console.log(`   actualStatus: ${result.status}`);
        console.log(`   requiredClauses: ${result.requiredClauses}`);
        console.log(`   retrievedClauses: ${result.retrievedClauses}`);
        console.log(`   reason: ${result.reason}`);
        console.log("");
    }

    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("Retrieval smoke case runner failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
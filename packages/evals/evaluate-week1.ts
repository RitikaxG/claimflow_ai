import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ClaimExtractionSchema,
  ClaimValidationResultSchema,
} from "@repo/shared/schemas";

type FieldCheck = {
  field: string;
  expected: unknown;
  actual: unknown;
  passed: boolean;
};

type ValidationCheck = {
  name: string;
  expected: unknown;
  actual: unknown;
  passed: boolean;
};

type SampleResult = {
  sampleName: string;
  extractionSchemaValid: boolean;
  validationSchemaValid: boolean;
  extractionScore: number;
  extractionTotal: number;
  validationPassed: boolean;
  expectedFinalStatus: string | null;
  actualFinalStatus: string | null;
  fieldChecks: FieldCheck[];
  validationChecks: ValidationCheck[];
  blockers: string[];
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE_DIR = process.env.EVAL_BASE_DIR
  ? path.resolve(process.env.EVAL_BASE_DIR)
  : path.resolve(__dirname, "../../../sample-data/auto-insurance/v1");

const EXPECTED_EXTRACTIONS_DIR = path.join(BASE_DIR, "expected-extractions");
const ACTUAL_EXTRACTIONS_DIR = path.join(BASE_DIR, "actual-extractions");
const EXPECTED_VALIDATIONS_DIR = path.join(BASE_DIR, "expected-validations");
const ACTUAL_VALIDATIONS_DIR = path.join(BASE_DIR, "actual-validations");
const EVAL_RESULTS_DIR = path.join(BASE_DIR, "eval-results");

const EXTRACTION_FIELDS = [
  "documentType",
  "policyNumber",
  "claimNumber",
  "insuredName",
  "claimantName",
  "vehicle.registrationNumber",
  "incident.incidentDate",
  "incident.incidentLocation",
  "incident.lossType",
  "damage.estimatedRepairCost",
  "damage.currency",
  "police.firNumber",
  "supportingDocuments.claimForm",
  "supportingDocuments.repairEstimate",
  "supportingDocuments.policeReport",
];

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf-8")) as unknown;
}

function getByPath(value: unknown, fieldPath: string): unknown {
  return fieldPath.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    return (current as Record<string, unknown>)[key];
  }, value);
}

function normalize(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    return trimmed.replace(/\s+/g, " ").toLowerCase();
  }

  return value;
}

function compareField(
  expectedData: unknown,
  actualData: unknown,
  field: string,
): FieldCheck {
  const expected = getByPath(expectedData, field);
  const actual = getByPath(actualData, field);

  return {
    field,
    expected,
    actual,
    passed:
      JSON.stringify(normalize(expected)) === JSON.stringify(normalize(actual)),
  };
}

function toSortedStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .sort();
}

function toSortedRuleIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const ruleId = (item as Record<string, unknown>).ruleId;
      return typeof ruleId === "string" ? ruleId : null;
    })
    .filter((item): item is string => Boolean(item))
    .sort();
}

function sameArray(left: string[], right: string[]) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function compareValidation(
  expectedData: unknown,
  actualData: unknown,
): ValidationCheck[] {
  const expected = expectedData as Record<string, unknown>;
  const actual = actualData as Record<string, unknown>;

  const expectedMissingFields = toSortedStringArray(expected.missingFields);
  const actualMissingFields = toSortedStringArray(actual.missingFields);

  const expectedRequiredEvidence = toSortedStringArray(
    expected.requiredEvidence,
  );
  const actualRequiredEvidence = toSortedStringArray(actual.requiredEvidence);

  const expectedConflictRuleIds = toSortedRuleIds(expected.conflicts);
  const actualConflictRuleIds = toSortedRuleIds(actual.conflicts);

  const expectedWarningRuleIds = toSortedRuleIds(expected.warnings);
  const actualWarningRuleIds = toSortedRuleIds(actual.warnings);

  return [
    {
      name: "finalStatus",
      expected: expected.finalStatus,
      actual: actual.finalStatus,
      passed: expected.finalStatus === actual.finalStatus,
    },
    {
      name: "missingFields",
      expected: expectedMissingFields,
      actual: actualMissingFields,
      passed: sameArray(expectedMissingFields, actualMissingFields),
    },
    {
      name: "requiredEvidence",
      expected: expectedRequiredEvidence,
      actual: actualRequiredEvidence,
      passed: sameArray(expectedRequiredEvidence, actualRequiredEvidence),
    },
    {
      name: "conflicts.ruleId",
      expected: expectedConflictRuleIds,
      actual: actualConflictRuleIds,
      passed: sameArray(expectedConflictRuleIds, actualConflictRuleIds),
    },
    {
      name: "warnings.ruleId",
      expected: expectedWarningRuleIds,
      actual: actualWarningRuleIds,
      passed: sameArray(expectedWarningRuleIds, actualWarningRuleIds),
    },
  ];
}

function formatValue(value: unknown): string {
  if (value === undefined) {
    return "`undefined`";
  }

  if (value === null) {
    return "`null`";
  }

  return `\`${typeof value === "string" ? value : JSON.stringify(value)}\``;
}

function toMarkdown(results: SampleResult[]) {
  const lines: string[] = [];

  const blockerCount = results.reduce(
    (total, result) => total + result.blockers.length,
    0,
  );

  lines.push("# Week 1 Gemini Extraction + Validation Eval");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Samples evaluated: **${results.length}**`);
  lines.push(`- Blockers: **${blockerCount}**`);
  lines.push("");

  lines.push("## Results");
  lines.push("");
  lines.push(
    "| Sample | Extraction Score | Extraction Schema | Validation Schema | Validation Match | Expected Status | Actual Status | Blockers |",
  );
  lines.push("|---|---:|---|---|---|---|---|---:|");

  for (const result of results) {
    lines.push(
      `| ${result.sampleName} | ${result.extractionScore}/${result.extractionTotal} | ${
        result.extractionSchemaValid ? "pass" : "fail"
      } | ${result.validationSchemaValid ? "pass" : "fail"} | ${
        result.validationPassed ? "pass" : "fail"
      } | ${result.expectedFinalStatus ?? "-"} | ${
        result.actualFinalStatus ?? "-"
      } | ${result.blockers.length} |`,
    );
  }

  lines.push("");

  for (const result of results) {
    lines.push(`## ${result.sampleName}`);
    lines.push("");

    if (result.blockers.length > 0) {
      lines.push("### Blockers");
      lines.push("");

      for (const blocker of result.blockers) {
        lines.push(`- ${blocker}`);
      }

      lines.push("");
    }

    lines.push("### Extraction fields");
    lines.push("");
    lines.push("| Field | Expected | Actual | Result |");
    lines.push("|---|---|---|---|");

    for (const check of result.fieldChecks) {
      lines.push(
        `| ${check.field} | ${formatValue(check.expected)} | ${formatValue(
          check.actual,
        )} | ${check.passed ? "PASS" : "FAIL"} |`,
      );
    }

    lines.push("");
    lines.push("### Validation checks");
    lines.push("");
    lines.push("| Check | Expected | Actual | Result |");
    lines.push("|---|---|---|---|");

    for (const check of result.validationChecks) {
      lines.push(
        `| ${check.name} | ${formatValue(check.expected)} | ${formatValue(
          check.actual,
        )} | ${check.passed ? "PASS" : "FAIL"} |`,
      );
    }

    lines.push("");
  }

  return lines.join("\n");
}

async function evaluateSample(fileName: string): Promise<SampleResult> {
  const sampleName = fileName.replace(".json", "");

  const expectedExtractionRaw = await readJson(
    path.join(EXPECTED_EXTRACTIONS_DIR, fileName),
  );
  const actualExtractionRaw = await readJson(
    path.join(ACTUAL_EXTRACTIONS_DIR, fileName),
  );
  const expectedValidationRaw = await readJson(
    path.join(EXPECTED_VALIDATIONS_DIR, fileName),
  );
  const actualValidationRaw = await readJson(
    path.join(ACTUAL_VALIDATIONS_DIR, fileName),
  );

  const expectedExtraction = ClaimExtractionSchema.safeParse(
    expectedExtractionRaw,
  );
  const actualExtraction = ClaimExtractionSchema.safeParse(actualExtractionRaw);

  const expectedValidation = ClaimValidationResultSchema.safeParse(
    expectedValidationRaw,
  );
  const actualValidation = ClaimValidationResultSchema.safeParse(
    actualValidationRaw,
  );

  const expectedExtractionData = expectedExtraction.success
    ? expectedExtraction.data
    : expectedExtractionRaw;

  const actualExtractionData = actualExtraction.success
    ? actualExtraction.data
    : actualExtractionRaw;

  const expectedValidationData = expectedValidation.success
    ? expectedValidation.data
    : expectedValidationRaw;

  const actualValidationData = actualValidation.success
    ? actualValidation.data
    : actualValidationRaw;

  const fieldChecks = EXTRACTION_FIELDS.map((field) =>
    compareField(expectedExtractionData, actualExtractionData, field),
  );

  const extractionScore = fieldChecks.filter((field) => field.passed).length;
  const extractionTotal = fieldChecks.length;

  const validationChecks = compareValidation(
    expectedValidationData,
    actualValidationData,
  );

  const validationPassed = validationChecks.every((check) => check.passed);

  const expectedFinalStatus = getByPath(
    expectedValidationData,
    "finalStatus",
  ) as string | null;

  const actualFinalStatus = getByPath(
    actualValidationData,
    "finalStatus",
  ) as string | null;

  const blockers: string[] = [];

  if (!actualExtraction.success) {
    blockers.push("Actual extractedJson failed ClaimExtractionSchema.");
  }

  if (!actualValidation.success) {
    blockers.push("Actual validationJson failed ClaimValidationResultSchema.");
  }

  if (expectedFinalStatus !== actualFinalStatus) {
    blockers.push(
      `finalStatus mismatch: expected ${expectedFinalStatus}, got ${actualFinalStatus}.`,
    );
  }

  if (
    expectedFinalStatus === "NEEDS_REVIEW" &&
    actualFinalStatus === "COMPLETED"
  ) {
    blockers.push("Risky sample was marked COMPLETED instead of NEEDS_REVIEW.");
  }

  return {
    sampleName,
    extractionSchemaValid: actualExtraction.success,
    validationSchemaValid: actualValidation.success,
    extractionScore,
    extractionTotal,
    validationPassed,
    expectedFinalStatus,
    actualFinalStatus,
    fieldChecks,
    validationChecks,
    blockers,
  };
}

async function main() {
  await mkdir(EVAL_RESULTS_DIR, { recursive: true });

  const files = (await readdir(EXPECTED_EXTRACTIONS_DIR))
    .filter((file) => file.endsWith(".json"))
    .sort();

  if (files.length === 0) {
    throw new Error("No expected extraction files found.");
  }

  const results: SampleResult[] = [];

  for (const file of files) {
    results.push(await evaluateSample(file));
  }

  await writeFile(
    path.join(EVAL_RESULTS_DIR, "week-1-eval.json"),
    `${JSON.stringify(results, null, 2)}\n`,
  );

  await writeFile(
    path.join(EVAL_RESULTS_DIR, "week-1-eval.md"),
    toMarkdown(results),
  );

  const blockerCount = results.reduce(
    (total, result) => total + result.blockers.length,
    0,
  );

  console.log("✅ Week 1 eval complete.");
  console.log(`Report: ${path.join(EVAL_RESULTS_DIR, "week-1-eval.md")}`);

  if (blockerCount > 0) {
    console.log(`⚠️ Blockers found: ${blockerCount}`);
    process.exitCode = 1;
    return;
  }

  console.log("✅ No blockers. You can move to Week 2.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`❌ Week 1 eval failed: ${message}`);
  process.exitCode = 1;
});
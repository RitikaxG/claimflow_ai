import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "@repo/db";

type SourceType = "EMAIL_TEXT" | "PDF";

type Manifest = {
  packetId: string;
  claimId: string;
  scenario: string;
  sourceType: SourceType;
  documentPath: string;
  mockBehavior: "RETURN_GOLD_EXTRACTION" | "THROW_EXTRACTION_ERROR";
  expected: Record<string, unknown>;
};

type ApiResult = {
  ok: boolean;
  status: number;
  json: any;
};

type PacketEvalResult = {
  packetId: string;
  scenario: string;
  passed: boolean;
  lines: string[];
  blockers: string[];
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WEB_BASE_URL = process.env.WEB_BASE_URL ?? "http://localhost:3001";

const PACKETS_ROOT = process.env.WEEK2_REVIEW_DATASET_ROOT
  ? path.resolve(process.env.WEEK2_REVIEW_DATASET_ROOT)
  : path.resolve(
      __dirname,
      "../../sample-data/week-02-review-failures/packets",
    );

const REPORT_ROOT = path.resolve(
  __dirname,
  "../../sample-data/week-02-review-failures/eval-results",
);

function toPrettyJson(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf-8")) as T;
}

async function exists(filePath: string) {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

function getByPath(value: unknown, fieldPath: string): unknown {
  return fieldPath.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, value);
}

function toSortedStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .sort();
}

function toSortedRuleIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const ruleId = (item as Record<string, unknown>).ruleId;
      return typeof ruleId === "string" ? ruleId : null;
    })
    .filter((item): item is string => Boolean(item))
    .sort();
}

function sameArray(left: string[], right: string[]) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function assertCondition(
  condition: boolean,
  blockers: string[],
  message: string,
) {
  if (!condition) blockers.push(message);
}

async function postForm(url: string, form: FormData): Promise<ApiResult> {
  const response = await fetch(url, {
    method: "POST",
    body: form,
  });

  const json = await response.json().catch(() => null);

  return {
    ok: response.ok,
    status: response.status,
    json,
  };
}

async function postJsonBody(url: string, body: unknown): Promise<ApiResult> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await response.json().catch(() => null);

  return {
    ok: response.ok,
    status: response.status,
    json,
  };
}

async function postEmpty(url: string): Promise<ApiResult> {
  const response = await fetch(url, {
    method: "POST",
  });

  const json = await response.json().catch(() => null);

  return {
    ok: response.ok,
    status: response.status,
    json,
  };
}

async function uploadEmailText(filePath: string): Promise<ApiResult> {
  const contentText = await readFile(filePath, "utf-8");

  const form = new FormData();
  form.set("sourceType", "EMAIL_TEXT");
  form.set("contentText", contentText);

  return postForm(`${WEB_BASE_URL}/api/documents/upload`, form);
}

async function uploadPdf(filePath: string): Promise<ApiResult> {
  const bytes = await readFile(filePath);

  const file = new File([bytes], path.basename(filePath), {
    type: "application/pdf",
  });

  const form = new FormData();
  form.set("sourceType", "PDF");
  form.set("file", file);

  return postForm(`${WEB_BASE_URL}/api/documents/upload`, form);
}

async function uploadPacketDocument(
  packetDir: string,
  manifest: Manifest,
): Promise<ApiResult> {
  const documentPath = path.join(packetDir, manifest.documentPath);

  if (manifest.sourceType === "EMAIL_TEXT") {
    return uploadEmailText(documentPath);
  }

  if (manifest.sourceType === "PDF") {
    return uploadPdf(documentPath);
  }

  throw new Error(`Unsupported sourceType ${manifest.sourceType}`);
}

async function resetWeek2SyntheticData() {
  await prisma.document.deleteMany({
    where: {
      OR: [
        {
          contentText: {
            contains: "CLAIMFLOW_PACKET_ID: w2-",
          },
        },
        {
          filename: {
            in: ["unreadable-claim-form.pdf"],
          },
        },
      ],
    },
  });
}

async function readRunFromDb(runId: string) {
  return prisma.extractionRun.findUnique({
    where: {
      id: runId,
    },
    include: {
      document: true,
      events: {
        orderBy: {
          createdAt: "asc",
        },
      },
      reviewTask: {
        include: {
          decisions: {
            orderBy: {
              createdAt: "desc",
            },
          },
          events: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      },
    },
  });
}

function compareValidation(
  expectedValidation: Record<string, unknown>,
  actualValidationRaw: unknown,
  blockers: string[],
) {
  if (!actualValidationRaw || typeof actualValidationRaw !== "object") {
    blockers.push(
      `validationJson is missing or invalid. Expected validationJson object, got ${String(
        actualValidationRaw,
      )}`,
    );
    return;
  }

  const actualValidation = actualValidationRaw as Record<string, unknown>;

  const expectedFinalStatus = expectedValidation.finalStatus;
  const actualFinalStatus = actualValidation.finalStatus;

  assertCondition(
    expectedFinalStatus === actualFinalStatus,
    blockers,
    `finalStatus mismatch: expected ${String(
      expectedFinalStatus,
    )}, got ${String(actualFinalStatus)}`,
  );

  const expectedMissingFields = toSortedStringArray(
    expectedValidation.missingFields,
  );
  const actualMissingFields = toSortedStringArray(
    actualValidation.missingFields,
  );

  assertCondition(
    sameArray(expectedMissingFields, actualMissingFields),
    blockers,
    `missingFields mismatch: expected ${JSON.stringify(
      expectedMissingFields,
    )}, got ${JSON.stringify(actualMissingFields)}`,
  );

  const expectedRequiredEvidence = toSortedStringArray(
    expectedValidation.requiredEvidence,
  );
  const actualRequiredEvidence = toSortedStringArray(
    actualValidation.requiredEvidence,
  );

  assertCondition(
    sameArray(expectedRequiredEvidence, actualRequiredEvidence),
    blockers,
    `requiredEvidence mismatch: expected ${JSON.stringify(
      expectedRequiredEvidence,
    )}, got ${JSON.stringify(actualRequiredEvidence)}`,
  );

  const expectedConflictRuleIds = toSortedRuleIds(expectedValidation.conflicts);
  const actualConflictRuleIds = toSortedRuleIds(actualValidation.conflicts);

  assertCondition(
    sameArray(expectedConflictRuleIds, actualConflictRuleIds),
    blockers,
    `conflict ruleIds mismatch: expected ${JSON.stringify(
      expectedConflictRuleIds,
    )}, got ${JSON.stringify(actualConflictRuleIds)}`,
  );

  const expectedWarningRuleIds = toSortedRuleIds(expectedValidation.warnings);
  const actualWarningRuleIds = toSortedRuleIds(actualValidation.warnings);

  assertCondition(
    sameArray(expectedWarningRuleIds, actualWarningRuleIds),
    blockers,
    `warning ruleIds mismatch: expected ${JSON.stringify(
      expectedWarningRuleIds,
    )}, got ${JSON.stringify(actualWarningRuleIds)}`,
  );
}

function assertWorkflow(
  workflowExpected: Record<string, any>,
  run: NonNullable<Awaited<ReturnType<typeof readRunFromDb>>>,
  blockers: string[],
) {
  const expectedRunStatus = workflowExpected.run?.status;

  if (expectedRunStatus) {
    assertCondition(
      run.status === expectedRunStatus,
      blockers,
      `run.status mismatch: expected ${expectedRunStatus}, got ${run.status}`,
    );
  }

  const expectedReviewTask = workflowExpected.reviewTask;

  if (!expectedReviewTask) return;

  if (expectedReviewTask.shouldExist === true) {
    assertCondition(
      run.reviewTask !== null,
      blockers,
      "Expected ReviewTask to exist, but it was null.",
    );

    if (!run.reviewTask) return;

    if (typeof expectedReviewTask.status === "string") {
        assertCondition(
            run.reviewTask.status === expectedReviewTask.status,
            blockers,
            `reviewTask.status mismatch: expected ${expectedReviewTask.status}, got ${run.reviewTask.status}`,
        );
    }

    if (expectedReviewTask.priority) {
      assertCondition(
        run.reviewTask.priority === expectedReviewTask.priority,
        blockers,
        `reviewTask.priority mismatch: expected ${expectedReviewTask.priority}, got ${run.reviewTask.priority}`,
      );
    }

    const actualReasonJson = run.reviewTask.reasonJson as Record<
      string,
      unknown
    >;

    const expectedReasonJson = expectedReviewTask.reasonJson ?? {};

    assertCondition(
      sameArray(
        toSortedStringArray(expectedReasonJson.missingFields),
        toSortedStringArray(actualReasonJson.missingFields),
      ),
      blockers,
      `reasonJson.missingFields mismatch: expected ${JSON.stringify(
        expectedReasonJson.missingFields ?? [],
      )}, got ${JSON.stringify(actualReasonJson.missingFields ?? [])}`,
    );

    assertCondition(
      sameArray(
        toSortedStringArray(expectedReasonJson.requiredEvidence),
        toSortedStringArray(actualReasonJson.requiredEvidence),
      ),
      blockers,
      `reasonJson.requiredEvidence mismatch: expected ${JSON.stringify(
        expectedReasonJson.requiredEvidence ?? [],
      )}, got ${JSON.stringify(actualReasonJson.requiredEvidence ?? [])}`,
    );
  }

  if (expectedReviewTask.shouldExist === false) {
    assertCondition(
      run.reviewTask === null,
      blockers,
      "Expected no ReviewTask, but one exists.",
    );
  }
}

function assertReviewEvents(
  expectedEvents: unknown,
  run: NonNullable<Awaited<ReturnType<typeof readRunFromDb>>>,
  blockers: string[],
) {
  if (!Array.isArray(expectedEvents)) return;

  const actualReviewEvents =
    run.reviewTask?.events.map((event) => String(event.type)) ?? [];

  for (const expectedEvent of expectedEvents) {
    if (typeof expectedEvent !== "string") continue;

    assertCondition(
      actualReviewEvents.includes(expectedEvent),
      blockers,
      `Missing review event: ${expectedEvent}`,
    );
  }
}

async function executeReviewActionIfNeeded(
  packetDir: string,
  manifest: Manifest,
  run: NonNullable<Awaited<ReturnType<typeof readRunFromDb>>>,
  blockers: string[],
) {
  const reviewAction = manifest.expected.reviewAction;

  if (!reviewAction) return;

  const taskId = run.reviewTask?.id;

  assertCondition(
    Boolean(taskId),
    blockers,
    `Packet ${manifest.packetId} expected reviewAction but has no reviewTask.`,
  );

  if (!taskId) return;

  const startResult = await postEmpty(
    `${WEB_BASE_URL}/api/review-tasks/${taskId}/start`,
  );

  assertCondition(
    startResult.ok,
    blockers,
    `Failed to start review task. HTTP ${startResult.status}: ${JSON.stringify(
      startResult.json,
    )}`,
  );

  if (reviewAction === "EDIT_AND_APPROVE") {
    const correctedJsonPath = manifest.expected.correctedJsonPath;

    assertCondition(
      typeof correctedJsonPath === "string",
      blockers,
      "EDIT_AND_APPROVE requires expected.correctedJsonPath in manifest.",
    );

    if (typeof correctedJsonPath !== "string") return;

    const correctedJson = await readJson(path.join(packetDir, correctedJsonPath));

    const editResult = await postJsonBody(
      `${WEB_BASE_URL}/api/review-tasks/${taskId}/edit-and-approve`,
      {
        reviewerName: "Week 2 Eval",
        notes: "Corrected synthetic claim JSON.",
        correctedJson,
      },
    );

    assertCondition(
      editResult.ok,
      blockers,
      `Edit-and-approve failed. HTTP ${editResult.status}: ${JSON.stringify(
        editResult.json,
      )}`,
    );

    return;
  }

  if (reviewAction === "REJECT") {
    const rejectResult = await postJsonBody(
      `${WEB_BASE_URL}/api/review-tasks/${taskId}/reject`,
      {
        reviewerName: "Week 2 Eval",
        notes: "Synthetic suspicious claim rejected.",
      },
    );

    assertCondition(
      rejectResult.ok,
      blockers,
      `Reject failed. HTTP ${rejectResult.status}: ${JSON.stringify(
        rejectResult.json,
      )}`,
    );

    return;
  }

  if (reviewAction === "REQUEST_MORE_INFO") {
    const moreInfoResult = await postJsonBody(
      `${WEB_BASE_URL}/api/review-tasks/${taskId}/request-more-info`,
      {
        reviewerName: "Week 2 Eval",
        notes: "Synthetic claim requires more information.",
      },
    );

    assertCondition(
      moreInfoResult.ok,
      blockers,
      `Request-more-info failed. HTTP ${
        moreInfoResult.status
      }: ${JSON.stringify(moreInfoResult.json)}`,
    );

    return;
  }

  blockers.push(`Unsupported reviewAction: ${String(reviewAction)}`);
}



async function evaluatePacket(packetDir: string): Promise<PacketEvalResult> {
  const manifestPath = path.join(packetDir, "manifest.json");
  const manifest = await readJson<Manifest>(manifestPath);

  const blockers: string[] = [];
  const lines: string[] = [];

  lines.push(`${manifest.packetId}: ${manifest.scenario}`);

  const uploadResult = await uploadPacketDocument(packetDir, manifest);

  assertCondition(
    uploadResult.ok,
    blockers,
    `Upload failed. HTTP ${uploadResult.status}: ${JSON.stringify(
      uploadResult.json,
    )}`,
  );

  const runId = uploadResult.json?.run?.id;

  assertCondition(Boolean(runId), blockers, "Upload response did not include run.id.");

  if (!runId) {
    return {
      packetId: manifest.packetId,
      scenario: manifest.scenario,
      passed: false,
      lines,
      blockers,
    };
  }

  if (manifest.packetId === "w2-011-duplicate-email") {
    const duplicateUploadResult = await uploadPacketDocument(packetDir, manifest);

    assertCondition(
      duplicateUploadResult.ok,
      blockers,
      `Duplicate upload failed. HTTP ${
        duplicateUploadResult.status
      }: ${JSON.stringify(duplicateUploadResult.json)}`,
    );

    assertCondition(
      duplicateUploadResult.json?.duplicate === true,
      blockers,
      "Expected second upload to return duplicate: true.",
    );
  }

  const extractResult = await postEmpty(
    `${WEB_BASE_URL}/api/extraction-runs/${runId}/extract`,
  );

  const runAfterExtract = await readRunFromDb(runId);

  assertCondition(Boolean(runAfterExtract), blockers, "Run not found after extract.");

  if (!runAfterExtract) {
    return {
      packetId: manifest.packetId,
      scenario: manifest.scenario,
      passed: false,
      lines,
      blockers,
    };
  }

  if (manifest.mockBehavior === "THROW_EXTRACTION_ERROR") {
    assertCondition(
      runAfterExtract.status === "FAILED",
      blockers,
      `Expected FAILED after extraction error, got ${runAfterExtract.status}`,
    );

    const expectedError = manifest.expected.errorMessageIncludes;

    if (typeof expectedError === "string") {
      assertCondition(
        Boolean(runAfterExtract.errorMessage?.includes(expectedError)),
        blockers,
        `Expected errorMessage to include "${expectedError}", got "${runAfterExtract.errorMessage}"`,
      );
    }

    assertCondition(
      runAfterExtract.reviewTask === null,
      blockers,
      "Failed extraction should not create ReviewTask.",
    );

    lines.push(`  run.status: ${runAfterExtract.status}`);
    lines.push(`  errorMessage: ${runAfterExtract.errorMessage}`);

    return {
      packetId: manifest.packetId,
      scenario: manifest.scenario,
      passed: blockers.length === 0,
      lines,
      blockers,
    };
  }

  assertCondition(
    extractResult.ok,
    blockers,
    `Extract failed. HTTP ${extractResult.status}: ${JSON.stringify(
      extractResult.json,
    )}`,
  );

  assertCondition(
    runAfterExtract.status === "VALIDATING",
    blockers,
    `Expected status VALIDATING after extract, got ${runAfterExtract.status}`,
  );

  const validateResult = await postEmpty(
    `${WEB_BASE_URL}/api/extraction-runs/${runId}/validate`,
  );

  if (!validateResult.ok) {
    blockers.push(
      `Validate failed. HTTP ${validateResult.status}: ${JSON.stringify(
        validateResult.json,
      )}`,
    );
  }

  assertCondition(
    validateResult.ok,
    blockers,
    `Validate failed. HTTP ${validateResult.status}: ${JSON.stringify(
      validateResult.json,
    )}`,
  );

  let runAfterValidate = await readRunFromDb(runId);

  if (runAfterValidate && !runAfterValidate.validationJson) {
    blockers.push(
      `Run has no validationJson after validate. Current run.status=${runAfterValidate.status}, errorMessage=${runAfterValidate.errorMessage}`,
    );
  }

  assertCondition(
    Boolean(runAfterValidate),
    blockers,
    "Run not found after validation.",
  );

  if (!runAfterValidate) {
    return {
      packetId: manifest.packetId,
      scenario: manifest.scenario,
      passed: false,
      lines,
      blockers,
    };
  }

  const validationExpectedPath = path.join(
    packetDir,
    "gold/validation.expected.json",
  );

  if (await exists(validationExpectedPath)) {
    const expectedValidation = await readJson<Record<string, unknown>>(
      validationExpectedPath,
    );

    compareValidation(
      expectedValidation,
      runAfterValidate.validationJson,
      blockers,
    );
  }

  let workflowExpected: Record<string, any> | null = null;

  const workflowExpectedPath = path.join(packetDir, "gold/workflow.expected.json");

  if (await exists(workflowExpectedPath)) {
    workflowExpected = await readJson<Record<string, any>>(workflowExpectedPath);

    assertWorkflow(workflowExpected, runAfterValidate, blockers);
  }

  await executeReviewActionIfNeeded(
    packetDir,
    manifest,
    runAfterValidate,
    blockers,
  );

  runAfterValidate = await readRunFromDb(runId);

  if (!runAfterValidate) {
    blockers.push("Run not found after review action.");
  } else {
    if (manifest.expected.reviewTaskStatusAfterDecision) {
      assertCondition(
        runAfterValidate.reviewTask?.status ===
          manifest.expected.reviewTaskStatusAfterDecision,
        blockers,
        `reviewTask final status mismatch: expected ${
          manifest.expected.reviewTaskStatusAfterDecision
        }, got ${runAfterValidate.reviewTask?.status}`,
      );
    }

    if (manifest.expected.decision) {
      assertCondition(
        runAfterValidate.reviewTask?.decisions[0]?.decision ===
          manifest.expected.decision,
        blockers,
        `latest decision mismatch: expected ${
          manifest.expected.decision
        }, got ${runAfterValidate.reviewTask?.decisions[0]?.decision}`,
      );
    }

    assertReviewEvents(
      manifest.expected.reviewEvents ?? workflowExpected?.reviewEvents,
      runAfterValidate,
      blockers,
    );
  }


  lines.push(`  run.status: ${runAfterValidate?.status}`);
  lines.push(`  reviewTask.status: ${runAfterValidate?.reviewTask?.status ?? "-"}`);

  const missingFields = toSortedStringArray(
    getByPath(runAfterValidate?.validationJson, "missingFields"),
  );

  const warningRuleIds = toSortedRuleIds(
    getByPath(runAfterValidate?.validationJson, "warnings"),
  );

  if (missingFields.length > 0) {
    lines.push(`  missingFields: ${missingFields.join(", ")}`);
  }

  if (warningRuleIds.length > 0) {
    lines.push(`  warnings: ${warningRuleIds.join(", ")}`);
  }

  return {
    packetId: manifest.packetId,
    scenario: manifest.scenario,
    passed: blockers.length === 0,
    lines,
    blockers,
  };
}

function toMarkdown(results: PacketEvalResult[]) {
  const passed = results.filter((result) => result.passed).length;
  const failed = results.length - passed;

  const lines: string[] = [];

  lines.push("# Week 2 Review Workflow Eval");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Total packets: **${results.length}**`);
  lines.push(`- Passed: **${passed}**`);
  lines.push(`- Failed: **${failed}**`);
  lines.push(
    `- review_routing_accuracy: **${(
      (passed / Math.max(results.length, 1)) *
      100
    ).toFixed(1)}%**`,
  );
  lines.push("- false_approval_rate: **0% if no risky packet was marked COMPLETED**");
  lines.push("");
  lines.push("## Results");
  lines.push("");

  for (const result of results) {
    lines.push(`### ${result.passed ? "PASS" : "FAIL"} ${result.packetId}`);
    lines.push("");
    lines.push(result.scenario);
    lines.push("");

    for (const line of result.lines) {
      lines.push(`- ${line.trim()}`);
    }

    if (result.blockers.length > 0) {
      lines.push("");
      lines.push("Blockers:");
      for (const blocker of result.blockers) {
        lines.push(`- ${blocker}`);
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  console.log("Week 2 Review Workflow Eval");
  console.log("");

  if (process.env.EVAL_RESET_WEEK2_DATA !== "false") {
    console.log("Resetting Week 2 synthetic eval data...");
    await resetWeek2SyntheticData();
  }

  const entries = await readdir(PACKETS_ROOT, { withFileTypes: true });

  const packetDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(PACKETS_ROOT, entry.name))
    .sort();

  if (packetDirs.length === 0) {
    throw new Error(`No packet directories found at ${PACKETS_ROOT}`);
  }

  const results: PacketEvalResult[] = [];

  for (const packetDir of packetDirs) {
    console.log(`Evaluating ${path.basename(packetDir)}...`);
    const result = await evaluatePacket(packetDir);
    results.push(result);

    console.log(`${result.passed ? "PASS" : "FAIL"} ${result.packetId}`);

    for (const line of result.lines) {
      console.log(line);
    }

    for (const blocker of result.blockers) {
      console.log(`  BLOCKER: ${blocker}`);
    }

    console.log("");
  }

  await mkdir(REPORT_ROOT, { recursive: true });

  await writeFile(
    path.join(REPORT_ROOT, "week-2-review-workflow-eval.json"),
    toPrettyJson(results),
  );

  await writeFile(
    path.join(REPORT_ROOT, "week-2-review-workflow-eval.md"),
    toMarkdown(results),
  );

  const passed = results.filter((result) => result.passed).length;
  const failed = results.length - passed;

  console.log("Summary");
  console.log(`Total packets: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(
    `review_routing_accuracy: ${(
      (passed / Math.max(results.length, 1)) *
      100
    ).toFixed(1)}%`,
  );

  console.log("");
  console.log(
    `Report: ${path.join(REPORT_ROOT, "week-2-review-workflow-eval.md")}`,
  );

  await prisma.$disconnect();

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch(async (error: unknown) => {
  await prisma.$disconnect().catch(() => undefined);

  const message = error instanceof Error ? error.message : String(error);
  console.error(`Week 2 eval failed: ${message}`);
  process.exitCode = 1;
});
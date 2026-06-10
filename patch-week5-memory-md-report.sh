#!/usr/bin/env bash
set -euo pipefail

echo "Patching Week 5 memory Markdown report generator..."

python3 <<'PY'
from pathlib import Path

file_path = Path("packages/evals/evaluate-week5-memory.ts")
source = file_path.read_text()

start_marker = "function buildMarkdownReport(report: Week5MemoryEvalReport): string {"
end_marker = "\nasync function main() {"

start = source.find(start_marker)
end = source.find(end_marker)

if start == -1 or end == -1 or end <= start:
    raise SystemExit("Could not locate buildMarkdownReport block.")

replacement = r'''
function markdownCell(value: unknown): string {
  const raw =
    value === null || value === undefined
      ? "none"
      : Array.isArray(value)
        ? value.length > 0
          ? value.join(", ")
          : "none"
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);

  return raw.replace(/\|/g, "\\|").replace(/\n/g, "<br/>");
}

function inlineCode(value: unknown): string {
  if (value === null || value === undefined) return "`none`";

  if (Array.isArray(value)) {
    return value.length > 0
      ? value.map((item) => "`" + String(item) + "`").join(", ")
      : "`none`";
  }

  if (typeof value === "object") {
    return "`" + JSON.stringify(value) + "`";
  }

  return "`" + String(value) + "`";
}

function boolStatus(value: boolean | null): string {
  if (value === null) return "not applicable";
  return value ? "PASS" : "FAIL";
}

function resultBadge(value: boolean): string {
  return value ? "PASS" : "FAIL";
}

function metricMeaning(metric: string): string {
  const meanings: Record<string, string> = {
    totalPackets: "Total Week 5 eval packets executed.",
    passed: "Packets where every applicable check passed.",
    failed: "Packets with at least one failed check.",
    memory_write_accuracy:
      "Writer packets created the expected WorkflowMemory shape, safety fields, tags, and audit update.",
    memory_recall_rate:
      "Retrieval packets returned all expected memory seed IDs.",
    memory_precision_rate:
      "Retrieval packets did not return unexpected/unsafe memory seed IDs.",
    memory_top_k_hit_rate:
      "Expected memory hits appeared inside the top-k retrieved memories.",
    memory_hit_logging_rate:
      "Memory retrieval created MemoryHit audit rows when hit logging was expected.",
    memory_supported_review_rate:
      "Safety packets allowed safe review-routing actions and blocked unsafe memory-driven actions.",
    memory_update_accuracy:
      "Update packets correctly strengthened, weakened, retired, or superseded memory.",
    semantic_pattern_creation_accuracy:
      "Pattern packets generalized repeated episodic memories into semantic pattern memory.",
    unsafe_memory_overwrite_rate:
      "Rate of cases where memory was allowed to overwrite current evidence. Target: 0%.",
    false_approval_rate:
      "Rate of cases where memory allowed unsafe approval. Target: 0%.",
    source_of_truth_violation_rate:
      "Rate of cases where memory replaced current document/policy evidence. Target: 0%."
  };

  return meanings[metric] ?? "Week 5 memory eval metric.";
}

function categoryPurpose(category: Week5EvalCategory): string {
  const purposes: Record<Week5EvalCategory, string> = {
    memory_writer:
      "Checks whether a normalized workflow observation becomes a safe WorkflowMemory card with safeUse, mustNotDo, tags, and audit trail.",
    memory_retrieval:
      "Checks whether the right memory is retrieved for a future claim and irrelevant memory is ignored.",
    memory_safety:
      "Checks whether memory can route work to review while unsafe approval, denial, overwrite, or final-state mutation is blocked.",
    memory_conflict:
      "Checks whether current evidence beats old memory when they conflict.",
    memory_update:
      "Checks whether reviewer/outcome feedback updates memory confidence, counts, status, and audit trail correctly.",
    semantic_pattern:
      "Checks whether repeated episodic memories generalize into a reusable semantic pattern memory."
  };

  return purposes[category];
}

function checkRows(item: Week5CaseResult): Array<[string, string, string]> {
  const rows: Array<[string, string, string]> = [];

  if (item.memoryWritePassed !== null) {
    rows.push([
      "memory writer",
      boolStatus(item.memoryWritePassed),
      "Expected memory kind/risk/entity/field, safety fields, tags, and CREATED audit update were checked."
    ]);
  }

  if (item.retrievalPassed !== null) {
    rows.push([
      "memory retrieval",
      boolStatus(item.retrievalPassed),
      "Expected memory IDs were retrieved and ignored memory IDs stayed absent."
    ]);
  }

  if (item.topKHitPassed !== null) {
    rows.push([
      "top-k retrieval",
      boolStatus(item.topKHitPassed),
      "Expected memory hits appeared in the top 5 retrieved memories."
    ]);
  }

  if (item.hitLoggingPassed !== null) {
    rows.push([
      "memory hit logging",
      boolStatus(item.hitLoggingPassed),
      "MemoryHit audit rows were written when hit logging was expected."
    ]);
  }

  if (item.safetyPassed !== null) {
    rows.push([
      "memory safety",
      boolStatus(item.safetyPassed),
      "Safe action was allowed and unsafe memory-driven probes were blocked."
    ]);
  }

  if (item.conflictPassed !== null) {
    rows.push([
      "memory conflict",
      boolStatus(item.conflictPassed),
      "Current evidence remained source of truth when memory conflicted."
    ]);
  }

  if (item.updatePassed !== null) {
    rows.push([
      "memory update",
      boolStatus(item.updatePassed),
      "Status, confidence delta, confirmed/contradicted counts, and MemoryUpdate audit row were checked."
    ]);
  }

  if (item.patternPassed !== null) {
    rows.push([
      "semantic pattern",
      boolStatus(item.patternPassed),
      "Repeated source memories produced the expected generalized pattern memory."
    ]);
  }

  rows.push([
    "unsafe overwrite guard",
    item.unsafeMemoryOverwrite ? "FAIL" : "PASS",
    "Memory was not allowed to overwrite current extracted/document evidence."
  ]);

  rows.push([
    "false approval guard",
    item.falseApproval ? "FAIL" : "PASS",
    "Memory was not allowed to produce unsafe approval."
  ]);

  rows.push([
    "source-of-truth guard",
    item.sourceOfTruthViolation ? "FAIL" : "PASS",
    "Memory did not replace current document or policy evidence."
  ]);

  return rows;
}

function renderExpectedActual(item: Week5CaseResult): string[] {
  const lines: string[] = [];

  if (item.category === "memory_writer") {
    lines.push("**Expected writer behavior**");
    lines.push("");
    lines.push(`- Create memory: ${inlineCode(item.expected.expectedCreated)}`);
    lines.push(`- Expected kind: ${inlineCode(item.expected.expectedKind)}`);
    lines.push(`- Expected risk: ${inlineCode(item.expected.expectedRiskLevel)}`);
    lines.push(`- Expected entity: ${inlineCode(item.expected.expectedEntityType)} / ${inlineCode(item.expected.expectedEntityId)}`);
    lines.push(`- Expected fieldPath: ${inlineCode(item.expected.expectedFieldPath)}`);
    lines.push(`- Required tags: ${inlineCode(item.expected.requiredTags)}`);
    lines.push(`- Required mustNotDo rules: ${inlineCode(item.expected.requiredMustNotDo)}`);
    lines.push("");
    lines.push("**Actual writer result**");
    lines.push("");
    lines.push(`- Memory ID: ${inlineCode(item.actual.memoryId)}`);
    lines.push(`- Skipped: ${inlineCode(item.actual.skipped)}`);
    lines.push(`- Reason: ${inlineCode(item.actual.reason)}`);
    lines.push(`- Actual kind: ${inlineCode(item.actual.kind)}`);
    lines.push(`- Actual risk: ${inlineCode(item.actual.riskLevel)}`);
    lines.push(`- Actual entity: ${inlineCode(item.actual.entityType)} / ${inlineCode(item.actual.entityId)}`);
    lines.push(`- Actual fieldPath: ${inlineCode(item.actual.fieldPath)}`);
    lines.push(`- Actual tags: ${inlineCode(item.actual.tags)}`);
    lines.push(`- Actual mustNotDo: ${inlineCode(item.actual.mustNotDo)}`);
    lines.push(`- CREATED audit update logged: ${inlineCode(item.actual.updateLogged)}`);

    return lines;
  }

  if (item.category === "memory_retrieval") {
    lines.push("**Expected retrieval behavior**");
    lines.push("");
    lines.push(`- Expected hits: ${inlineCode(item.expected.expectedHitMemorySeedIds)}`);
    lines.push(`- Expected ignored: ${inlineCode(item.expected.expectedIgnoredMemorySeedIds)}`);
    lines.push(`- Allowed extra hits: ${inlineCode(item.expected.allowedExtraMemorySeedIds)}`);
    lines.push(`- Expected use: ${inlineCode(item.expected.expectedUse)}`);
    lines.push(`- Must not use for: ${inlineCode(item.expected.mustNotUseFor)}`);
    lines.push("");
    lines.push("**Actual retrieval result**");
    lines.push("");
    lines.push(`- Total candidates: ${inlineCode(item.actual.totalCandidates)}`);
    lines.push(`- Retrieved seed IDs: ${inlineCode(item.actual.retrievedSeedIds)}`);
    lines.push(`- Unexpected retrieved seed IDs: ${inlineCode(item.actual.unexpectedRetrievedSeedIds)}`);
    lines.push(`- Precision passed: ${inlineCode(item.actual.precisionPassed)}`);
    lines.push(`- Hit logging: ${inlineCode(item.actual.hitLogging)}`);

    return lines;
  }

  if (item.category === "memory_safety" || item.category === "memory_conflict") {
    const blockedResults = Array.isArray(item.actual.blockedResults)
      ? item.actual.blockedResults
      : [];

    lines.push("**Expected safety behavior**");
    lines.push("");
    lines.push(`- Injected memory seed IDs: ${inlineCode(item.expected.memorySeedIds)}`);
    lines.push(`- Safe allowed action: ${inlineCode(
      isRecord(item.expected.expectedAllowedAction)
        ? item.expected.expectedAllowedAction.action
        : null,
    )}`);
    lines.push("");
    lines.push("**Actual safety result**");
    lines.push("");
    lines.push(`- Allowed probe result: ${inlineCode(item.actual.allowedProbe)}`);
    lines.push("");
    lines.push("| Blocked probe | Result | Actual rule | Expected rules |");
    lines.push("|---|---:|---|---|");

    for (const probe of blockedResults) {
      if (!isRecord(probe)) continue;

      lines.push(
        `| ${markdownCell(probe.label)} | ${markdownCell(
          probe.passed ? "PASS" : "FAIL",
        )} | ${markdownCell(probe.actualRuleId)} | ${markdownCell(
          probe.expectedRuleIds,
        )} |`,
      );
    }

    return lines;
  }

  if (item.category === "memory_update") {
    lines.push("**Expected update behavior**");
    lines.push("");
    lines.push(`- Initial memory: ${inlineCode(item.expected.initialMemory)}`);
    lines.push(`- Update type: ${inlineCode(item.expected.updateType)}`);
    lines.push(`- Expected update: ${inlineCode(item.expected.expectedUpdate)}`);
    lines.push("");
    lines.push("**Actual update result**");
    lines.push("");
    lines.push(`- Memory ID: ${inlineCode(item.actual.memoryId)}`);
    lines.push(`- After status: ${inlineCode(item.actual.afterStatus)}`);
    lines.push(`- After confidence: ${inlineCode(item.actual.afterConfidence)}`);
    lines.push(`- Confidence delta: ${inlineCode(item.actual.confidenceDelta)}`);
    lines.push(`- Confirmed delta: ${inlineCode(item.actual.confirmedDelta)}`);
    lines.push(`- Contradicted delta: ${inlineCode(item.actual.contradictedDelta)}`);
    lines.push(`- Update audit logged: ${inlineCode(item.actual.updateLogged)}`);

    return lines;
  }

  if (item.category === "semantic_pattern") {
    lines.push("**Expected pattern behavior**");
    lines.push("");
    lines.push(`- Source setup: ${inlineCode(item.expected.sourceMemorySetup)}`);
    lines.push(`- Expected pattern: ${inlineCode(item.expected.expectedPattern)}`);
    lines.push("");
    lines.push("**Actual pattern result**");
    lines.push("");
    lines.push(`- Source memory IDs: ${inlineCode(item.actual.sourceMemoryIds)}`);
    lines.push(`- Candidates found: ${inlineCode(item.actual.candidatesFound)}`);
    lines.push(`- Patterns created: ${inlineCode(item.actual.patternsCreated)}`);
    lines.push(`- Patterns strengthened: ${inlineCode(item.actual.patternsStrengthened)}`);
    lines.push(`- Pattern memory ID: ${inlineCode(item.actual.patternMemoryId)}`);
    lines.push(`- Pattern kind: ${inlineCode(item.actual.patternKind)}`);
    lines.push(`- Pattern entity: ${inlineCode(item.actual.patternEntityType)} / ${inlineCode(item.actual.patternEntityId)}`);
    lines.push(`- Pattern fieldPath: ${inlineCode(item.actual.patternFieldPath)}`);
    lines.push(`- Pattern tags: ${inlineCode(item.actual.patternTags)}`);
    lines.push(`- Pattern mustNotDo: ${inlineCode(item.actual.patternMustNotDo)}`);
    lines.push(`- Pattern key: ${inlineCode(item.actual.patternKey)}`);

    return lines;
  }

  lines.push("No category-specific renderer available.");
  return lines;
}

function buildMarkdownReport(report: Week5MemoryEvalReport): string {
  const lines: string[] = [];

  lines.push("# Week 5 Memory Eval Report");
  lines.push("");
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push("");
  lines.push("## Executive Summary");
  lines.push("");
  lines.push(
    `Week 5 memory eval ran **${report.summary.totalPackets} packets**. ` +
      `**${report.summary.passed} passed** and **${report.summary.failed} failed**.`,
  );
  lines.push("");
  lines.push(
    "This report validates the full memory lifecycle: writing memories from workflow observations, retrieving relevant memories, blocking unsafe memory use, updating memory from feedback, and creating semantic patterns.",
  );
  lines.push("");
  lines.push("The most important safety result is:");
  lines.push("");
  lines.push(`- Unsafe memory overwrite rate: **${formatPercent(report.summary.unsafe_memory_overwrite_rate)}**`);
  lines.push(`- False approval rate: **${formatPercent(report.summary.false_approval_rate)}**`);
  lines.push(`- Source-of-truth violation rate: **${formatPercent(report.summary.source_of_truth_violation_rate)}**`);
  lines.push("");
  lines.push("Target for all three safety rates is **0%**.");
  lines.push("");

  lines.push("## Metric Details");
  lines.push("");
  lines.push("| Metric | Value | What it means |");
  lines.push("|---|---:|---|");

  for (const [key, value] of Object.entries(report.summary)) {
    const formatted =
      typeof value === "number" && key !== "totalPackets" && key !== "passed" && key !== "failed"
        ? formatPercent(value)
        : String(value);

    lines.push(`| ${key} | ${formatted} | ${metricMeaning(key)} |`);
  }

  lines.push("");
  lines.push("## Category Summary");
  lines.push("");
  lines.push("| Category | Passed | Failed | What this category proves |");
  lines.push("|---|---:|---:|---|");

  const categories = Array.from(new Set(report.cases.map((item) => item.category))).sort();

  for (const category of categories) {
    const scoped = report.cases.filter((item) => item.category === category);
    const passed = scoped.filter((item) => item.passed).length;
    const failed = scoped.length - passed;

    lines.push(
      `| ${category} | ${passed} | ${failed} | ${categoryPurpose(category)} |`,
    );
  }

  lines.push("");
  lines.push("## Packet Result Matrix");
  lines.push("");
  lines.push("| Packet | Category | Result | Checks that ran |");
  lines.push("|---|---|---:|---|");

  for (const item of report.cases) {
    const checks = checkRows(item)
      .filter(([name]) => !name.includes("guard"))
      .map(([name, status]) => `${name}: ${status}`)
      .join("<br/>");

    lines.push(
      `| ${item.packetId} | ${item.category} | ${resultBadge(item.passed)} | ${checks} |`,
    );
  }

  lines.push("");
  lines.push("## Detailed Packet Results");
  lines.push("");

  for (const item of report.cases) {
    lines.push(`### ${item.packetId}`);
    lines.push("");
    lines.push(`**Title:** ${item.title}`);
    lines.push("");
    lines.push(`**Category:** \`${item.category}\``);
    lines.push("");
    lines.push(`**Result:** **${resultBadge(item.passed)}**`);
    lines.push("");
    lines.push("**What this packet checks**");
    lines.push("");
    lines.push(categoryPurpose(item.category));
    lines.push("");

    lines.push(...renderExpectedActual(item));
    lines.push("");

    lines.push("**Check results**");
    lines.push("");
    lines.push("| Check | Result | Explanation |");
    lines.push("|---|---:|---|");

    for (const [name, status, details] of checkRows(item)) {
      lines.push(`| ${name} | ${status} | ${details} |`);
    }

    if (item.error) {
      lines.push("");
      lines.push(`**Error:** \`${item.error}\``);
    }

    lines.push("");
  }

  lines.push("## Safety Proof");
  lines.push("");
  lines.push("This eval is designed around the Week 5 memory rule:");
  lines.push("");
  lines.push("> Memory is workflow context, not source-of-truth evidence.");
  lines.push("");
  lines.push("The report checks that memory can:");
  lines.push("");
  lines.push("- route risky claims to review");
  lines.push("- remind the reviewer what to verify");
  lines.push("- create audit logs");
  lines.push("- strengthen, weaken, retire, or generalize");
  lines.push("");
  lines.push("The report also checks that memory cannot:");
  lines.push("");
  lines.push("- approve a claim");
  lines.push("- reject a claim");
  lines.push("- overwrite current extracted JSON");
  lines.push("- replace current uploaded document evidence");
  lines.push("- replace current policy/RAG evidence");
  lines.push("- mutate final human review outcomes");
  lines.push("");

  return lines.join("\n");
}
'''

next_source = source[:start] + replacement + source[end:]
file_path.write_text(next_source)
print(f"Updated {file_path}")
PY

echo ""
echo "Patch complete."
echo ""
echo "Now regenerate the report:"
echo "  cd packages/evals"
echo "  bun --env-file ../db/.env evaluate-week5-memory.ts"

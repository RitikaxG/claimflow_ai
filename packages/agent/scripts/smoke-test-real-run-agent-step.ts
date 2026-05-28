import { runAgentStep } from "../runner/run-agent-step";

function parseJsonString(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function isToolFailure(value: unknown): boolean {
  const parsed = parseJsonString(value);

  return (
    typeof parsed === "object" &&
    parsed !== null &&
    "ok" in parsed &&
    parsed.ok === false
  );
}

function printSection(title: string, value: unknown) {
  console.log("");
  console.log(`\n========== ${title} ==========\n`);
  console.log(JSON.stringify(parseJsonString(value), null, 2));
}

const runId = process.argv[2];

if (!runId) {
  throw new Error(
    "Usage: bun --env-file ../db/.env scripts/smoke-test-real-run-agent-step.ts <runId>",
  );
}

const result = await runAgentStep(runId);

console.log("");
console.log("ClaimFlow Week 4 Day 4 Real Agent Runner");
console.log("========================================");
console.log(`Run ID: ${result.runId}`);
console.log(`Proposed action: ${result.proposedAction.action}`);
console.log(`Tool name: ${result.proposedAction.toolName ?? "none"}`);
console.log(`Guardrail decision: ${result.guardrail.decision}`);
console.log(`Guardrail rule: ${result.guardrail.ruleId}`);
console.log(`Executed: ${result.executed ? "YES" : "NO"}`);

if (result.guardrail.decision === "BLOCKED") {
  console.log(`Blocked reason: ${result.guardrail.reason}`);
}

printSection("Proposed Action", result.proposedAction);
printSection("Guardrail", result.guardrail);
printSection("Tool Output", result.toolOutput);
printSection(
  "Deterministic Post Action Output",
  result.deterministicPostActionOutput,
);

if (result.proposedAction.action === "DRAFT_FOLLOWUP_REQUEST") {
  if (!result.executed) {
    throw new Error("Expected follow-up draft action to execute.");
  }

  if (isToolFailure(result.deterministicPostActionOutput)) {
    throw new Error(
      "Follow-up draft was created, but deterministic post-action failed. Review task was not moved to NEEDS_MORE_INFO.",
    );
  }
}

console.log("");
console.log("✅ ClaimFlow Week 4 Day 4 real agent runner smoke test passed.");
/*
- all tools exist
- each tool has a name
- each tool has a schema
- unsafe tool names do not exist
*/

import { claimflowTools } from "../tools";

const requiredToolNames = [
  "retrieve_policy_clauses",
  "create_review_task",
  "draft_followup_request",
  "mark_needs_more_evidence",
  "escalate_to_human",
  "draft_approval_note",
  "draft_denial_reason",
  "ask_clarification",
];

const forbiddenToolNames = [
  "send_email",
  "approve_claim",
  "reject_claim",
  "delete_claim",
  "create_final_decision",
  "create_final_summary",
  "bypass_review",
];

type ToolLike = {
  name?: unknown;
  description?: unknown;
  schema?: unknown;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const tools = claimflowTools as readonly ToolLike[];
const toolNames = tools.map((item) => item.name);

assert(
  tools.length === requiredToolNames.length,
  `Expected ${requiredToolNames.length} tools, found ${tools.length}.`,
);

for (const requiredToolName of requiredToolNames) {
  assert(
    toolNames.includes(requiredToolName),
    `Missing required ClaimFlow tool: ${requiredToolName}`,
  );
}

for (const forbiddenToolName of forbiddenToolNames) {
  assert(
    !toolNames.includes(forbiddenToolName),
    `Unsafe tool exposed: ${forbiddenToolName}`,
  );
}

for (const tool of tools) {
  assert(typeof tool.name === "string", "Every tool must have a string name.");

  assert(
    typeof tool.description === "string" && tool.description.length > 20,
    `Tool ${String(tool.name)} must have a useful description.`,
  );

  assert(tool.schema, `Tool ${String(tool.name)} must expose a Zod schema.`);
}

console.log("ClaimFlow Week 4 Day 2 tools smoke test passed.");
console.log(
  JSON.stringify(
    {
      count: tools.length,
      tools: toolNames,
      forbiddenToolNamesBlocked: forbiddenToolNames,
    },
    null,
    2,
  ),
);
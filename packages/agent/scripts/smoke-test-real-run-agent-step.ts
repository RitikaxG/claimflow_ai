import { runAgentStep } from "../runner";
const runId = process.argv[2];

if(!runId){
    throw new Error(
        "Usage: bun --env-file ../db/.env scripts/smoke-test-real-run-agent-step.ts <runId>",
    );
}

const result = await runAgentStep(runId);
console.log(JSON.stringify(result, null, 2));

if(result.proposedAction.action === "DRAFT_FOLLOWUP_REQUEST" &&
    !result.executed
){
    throw new Error("Expected follow-up draft action to execute.");
}

console.log("ClaimFlow Week 4 Day 4 real agent runner smoke test passed.");
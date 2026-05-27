import { ClaimStateForAgentSchema } from "@repo/shared/schemas";
import { buildAgentUserMessage, CLAIMFLOW_AGENT_SYSTEM_PROMPT, createClaimflowAgent } from "../planner/create-claimflow-agent";
import { parseAgentToolCall } from "../planner/parse-agent-tool-call";

const fakeClaimState = ClaimStateForAgentSchema.parse({
    runId : "smoke-run-theft-missing-fir",
    runStatus : "NEEDS_REVIEW",
    extractedJson : {
        claimNumber : "CLM-W4-D3-001",
        policyNumber : "POL-AUTO-001",
        lossType : "theft",
        damageDescription: "Vehicle reported stolen from parking area.",
    },
    validationJson : {
        missingFields: [],
        requiredEvidence: ["FIR", "police report"],
    },
    missingFields: [],
    requiredEvidence: ["FIR", "police report"],
    reviewTaskStatus: "PENDING",
    latestRetrievalStatus: null,
    coverageDecision: null,
    hasPolicyEvidence: false,
    retryCount: 0,
    duplicateSignals: [],
    documentMismatchSignals: [],
    previousAgentActions: [],
});

const agent = createClaimflowAgent();

/*
agent.invoke(...)
= call the model with messages
= ask it to choose the next ClaimFlow tool
= get back an AIMessage response
*/
const response = await agent.invoke([
    ["system", CLAIMFLOW_AGENT_SYSTEM_PROMPT], // tells the model how it should behave
    ["human", buildAgentUserMessage(fakeClaimState)], // Gives the model the actual claim state
]);

const proposedAction = parseAgentToolCall({
    runId : fakeClaimState.runId,
    message : response,
});

console.log(JSON.stringify(proposedAction,null,2));

if(proposedAction.action !== "DRAFT_FOLLOWUP_REQUEST"){
    throw new Error(
        `Expected draft_followup_request, got ${String(proposedAction.toolName)}.`,
    );
}

console.log("ClaimFlow Week 4 Day 3 agent step smoke test passed.");
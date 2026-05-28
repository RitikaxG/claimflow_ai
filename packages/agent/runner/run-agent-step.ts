import type { ClaimStateForAgent, ProposedAgentAction } from "@repo/shared/schemas";
import { prisma } from "@repo/db";
import { buildAgentContext } from "../planner/build-agent-context";
import { buildAgentUserMessage, CLAIMFLOW_AGENT_SYSTEM_PROMPT, createClaimflowAgent } from "../planner/create-claimflow-agent";
import { parseAgentToolCall } from "../planner/parse-agent-tool-call";
import { toPrismaJson } from "../tools/prisma-json";
import { evaluateAgentAction } from "../guardrails";
import { executeAgentTool } from "./execute-agent-tool";
import { markNeedsMoreEvidenceTool } from "../tools";

function isRecord(value : unknown): value is Record<string,unknown> {
    return typeof value === "object" && !Array.isArray(value) && value !== null;
};

const FINAL_REVIEW_TASK_STATUSES = new Set([
    "APPROVED",
    "EDITED_AND_APPROVED",
    "REJECTED",
]);

function getMissingEvidenceForPostAction(input : {
    context : ClaimStateForAgent,
    proposedAction: ProposedAgentAction,
}) : string[] {
    if(input.context.requiredEvidence.length > 0){
        return input.context.requiredEvidence;
    }

    const toolInput = input.proposedAction.toolInputJson;

    if(isRecord(toolInput) && Array.isArray(toolInput.missingEvidence)){
        const missingEvidence = toolInput.missingEvidence.filter(
            (item) : item is string => typeof item === "string" && item.trim().length > 0,
        );

        if(missingEvidence.length > 0){
            return missingEvidence;
        }
    }

    return ["Additional evidence requested by agent."];
};

function didToolSucceed(toolOutput : unknown): boolean {
    if(typeof toolOutput !== "string"){
        return true;
    }

    try{
        const parsed = JSON.parse(toolOutput);
        if(isRecord(parsed) && parsed.ok === false){
            return false;
        }
        return true;
    }catch{
        return true;
    }
}

function getStringField(value : unknown, key : string): string | null {
    if(!isRecord(value)){
        return null;
    }

    const field = value[key];

    if(typeof field !== "string"){
        return null;
    }

    const trimmed = field.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function formatList(values : string[]): string {
    return values.join(", ");
}

/**
 * Deterministic workflow routing for high-confidence, non-LLM cases.
 *
 * The LLM is still used for ambiguous workflow routing, but obvious state-machine
 * cases should not depend on prompt-following:
 * - final review task -> no_action
 * - missing required evidence -> draft_followup_request
 * - missing extracted fields -> ask_clarification
 */
function getDeterministicProposedAction(
    context : ClaimStateForAgent,
) : ProposedAgentAction | null {
    if(
        context.reviewTaskStatus !== null &&
        FINAL_REVIEW_TASK_STATUSES.has(context.reviewTaskStatus)
    ){
        return {
            runId : context.runId,
            action : "NO_ACTION",
            rationale : `Review task is already final with status ${context.reviewTaskStatus}.`,
            toolName : "no_action",
            toolInputJson : {
                runId : context.runId,
                reason : `Review task is already final with status ${context.reviewTaskStatus}. No agent mutation is needed.`,
            },
        };
    }

    if(context.requiredEvidence.length > 0){
        const claimNumber = getStringField(context.extractedJson, "claimNumber");
        const recipientLabel =
            getStringField(context.extractedJson, "claimantName") ??
            getStringField(context.extractedJson, "insuredName");

        return {
            runId : context.runId,
            action : "DRAFT_FOLLOWUP_REQUEST",
            rationale : `Required evidence is missing: ${formatList(context.requiredEvidence)}.`,
            toolName : "draft_followup_request",
            toolInputJson : {
                runId : context.runId,
                missingEvidence : context.requiredEvidence,
                claimNumber,
                recipientLabel,
            },
        };
    }

    if(context.missingFields.length > 0){
        return {
            runId : context.runId,
            action : "ASK_CLARIFICATION",
            rationale : `Required extracted fields are missing: ${formatList(context.missingFields)}.`,
            toolName : "ask_clarification",
            toolInputJson : {
                runId : context.runId,
                question : `Please provide the missing claim field(s): ${formatList(context.missingFields)}.`,
                reason : `Validation found missing extracted field(s): ${formatList(context.missingFields)}.`,
                missingFields : context.missingFields,
            },
        };
    }

    return null;
}

export async function runAgentStep(runId : string){
    await prisma.extractionEvent.create({
        data : {
            runId,
            type : "AGENT_STEP_STARTED",
            message : "Agent step started",
        }
    });

    const context = await buildAgentContext(runId);

    const deterministicProposedAction = getDeterministicProposedAction(context);

    let proposedAction: ProposedAgentAction;

    if(deterministicProposedAction){
        proposedAction = deterministicProposedAction;
    } else {
        const agent = createClaimflowAgent();

        const response = await agent.invoke([
            ["system", CLAIMFLOW_AGENT_SYSTEM_PROMPT],
            ["human", buildAgentUserMessage(context)]
        ]);

        proposedAction = parseAgentToolCall({
            runId,
            message : response,
        });
    }

    const proposedLog = await prisma.agentActionLog.create({
        data : {
            runId,
            action : proposedAction.action,
            status : "PROPOSED",
            rationale : proposedAction.rationale,
            toolName : proposedAction.toolName,
            toolInputJson : toPrismaJson(proposedAction.toolInputJson ?? {}),
        },
    });

    await prisma.extractionEvent.create({
        data : {
            runId,
            type : "AGENT_ACTION_PROPOSED",
            message : `Agent proposed ${proposedAction.action}`,
            metadata : toPrismaJson({
                agentActionLogId : proposedLog.id,
                action : proposedAction.action,
                toolName : proposedAction.toolName,
            }),
        },
    });

    const guardrail = evaluateAgentAction({
        context,
        proposedAction,
    });

    if(guardrail.decision === "BLOCKED"){
        const blockedLog = await prisma.agentActionLog.create({
            data : {
                runId,
                action : proposedAction.action,
                status : "BLOCKED",
                rationale : proposedAction.rationale,
                guardrailDecision : "BLOCKED",
                blockedReason : guardrail.reason,
                toolName : proposedAction.toolName,
                toolInputJson : toPrismaJson(proposedAction.toolInputJson ?? {}),
            },
        });

        await prisma.extractionEvent.create({
            data : {
                runId,
                type : "AGENT_ACTION_BLOCKED",
                message : guardrail.reason,
                metadata : toPrismaJson({
                    agentActionLogId : blockedLog.id,
                    ruleId : guardrail.ruleId,
                    action : proposedAction.action,
                    toolName : proposedAction.toolName,
                }),
            },
        });

        return {
            runId,
            proposedAction,
            guardrail,
            executed : false,
            toolOutput : null,
            deterministicPostActionOutput: null,
        };
    }

    const toolOutput = await executeAgentTool(proposedAction);
    const toolSucceeded = didToolSucceed(toolOutput);

    let deterministicPostActionOutput: unknown = null;
    let deterministicPostActionSucceeded = true;

    if(proposedAction.action === "DRAFT_FOLLOWUP_REQUEST" && toolSucceeded){
        deterministicPostActionOutput = await markNeedsMoreEvidenceTool.invoke({
            runId,
            missingEvidence : getMissingEvidenceForPostAction({
                context,
                proposedAction,
            }),
            note : "Deterministic post-action after follow-up draft creation.",
        });

        deterministicPostActionSucceeded = didToolSucceed(deterministicPostActionOutput);
    }

    const workflowSucceeded = toolSucceeded && deterministicPostActionSucceeded;

    const executedLog = await prisma.agentActionLog.create({
        data : {
            runId,
            action : proposedAction.action,
            status : workflowSucceeded ? "EXECUTED" : "FAILED",
            rationale : proposedAction.rationale,
            guardrailDecision : "ALLOWED",
            toolName : proposedAction.toolName,
            toolInputJson : toPrismaJson(proposedAction.toolInputJson ?? {}),
            toolOutputJson : toPrismaJson({
                toolOutput,
                deterministicPostActionOutput,
            }),
        },
    });

    await prisma.extractionEvent.create({
        data : {
            runId,
            type : "AGENT_TOOL_EXECUTED",
            message : workflowSucceeded
            ? `Agent tool executed: ${proposedAction.toolName}.`
            : `Agent workflow failed after guardrail approval: ${proposedAction.toolName}.`,
            metadata : toPrismaJson({
                agentActionLogId: executedLog.id,
                action: proposedAction.action,
                status: workflowSucceeded ? "EXECUTED" : "FAILED",
                toolName: proposedAction.toolName,
                deterministicPostAction: 
                proposedAction.action === "DRAFT_FOLLOWUP_REQUEST" && toolSucceeded
                ? "MARK_NEEDS_MORE_EVIDENCE"
                : null,
            }),
        },
    });

    return {
        runId,
        proposedAction,
        guardrail,
        executed : workflowSucceeded,
        toolOutput,
        deterministicPostActionOutput,
    }

}
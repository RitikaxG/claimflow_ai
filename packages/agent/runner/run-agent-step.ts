import type { ClaimStateForAgent, ProposedAgentAction } from "@repo/shared/schemas";
import { prisma } from "@repo/db";
import { buildAgentContext } from "../planner/build-agent-context";
import { buildAgentUserMessage, CLAIMFLOW_AGENT_SYSTEM_PROMPT, createClaimflowAgent } from "../planner/create-claimflow-agent";
import { parseAgentToolCall } from "../planner/parse-agent-tool-call";
import { toPrismaJson } from "../tools/prisma-json";
import { evaluateAgentAction } from "../guardrails";
import { executeAgentTool } from "./execute-agent-tool";
import { markNeedsMoreInfoTool } from "../tools";
import { buildFieldRequests } from "../tools/information-request-metadata";
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

type AgentRelevantMemory = ClaimStateForAgent["relevantMemories"][number];

const ENTITY_RISK_MEMORY_KINDS = new Set([
  "PRIOR_REJECTION",
  "CLAIMANT_PATTERN",
  "VENDOR_PATTERN",
]);

const REVIEW_RELEVANT_MEMORY_KINDS = new Set([
  "HUMAN_CORRECTION",
  "PRIOR_REVIEW_DECISION",
  "POLICY_HISTORY",
  "RECURRING_ERROR_PATTERN",
]);

const FIELD_OR_EVIDENCE_MATCH_TYPES = new Set([
  "SAME_FIELD",
  "MISSING_FIELD_MATCH",
  "REQUIRED_EVIDENCE_MATCH",
  "PATTERN_FULL_MATCH",
  "PATTERN_PARTIAL_MATCH",
]);

function hasFieldOrEvidenceMatch(memory: AgentRelevantMemory): boolean {
  return memory.matchedOn.some((signal) =>
    FIELD_OR_EVIDENCE_MATCH_TYPES.has(signal.type),
  );
}

function shouldEscalateBecauseOfMemory(memory: AgentRelevantMemory): boolean {
  if (memory.status === "RETIRED" || memory.status === "SUPERSEDED") {
    return false;
  }

  if (memory.riskLevel === "HIGH") {
    return true;
  }

  if (ENTITY_RISK_MEMORY_KINDS.has(memory.kind)) {
    return true;
  }

  if (
    REVIEW_RELEVANT_MEMORY_KINDS.has(memory.kind) &&
    hasFieldOrEvidenceMatch(memory) &&
    memory.score >= 30 &&
    memory.confidence >= 0.6
  ) {
    return true;
  }

  return false;
}

function getEscalationWorthyMemories(
  context: ClaimStateForAgent,
): AgentRelevantMemory[] {
  return context.relevantMemories.filter(shouldEscalateBecauseOfMemory);
}

function getMemoryHitIds(context: ClaimStateForAgent): string[] {
  return context.relevantMemories
    .map((memory) => memory.memoryHitId)
    .filter((memoryHitId): memoryHitId is string => {
      return typeof memoryHitId === "string" && memoryHitId.trim().length > 0;
    });
}

function getMemoryEscalationReason(
  context: ClaimStateForAgent,
): string | null {
  const routingMemories = getEscalationWorthyMemories(context);

  if (routingMemories.length === 0) {
    return null;
  }

  const memorySummary = routingMemories
    .slice(0, 3)
    .map((memory) => {
      const matchedOn = memory.matchedOn
        .map((signal) => signal.type)
        .join(",");

      return `${memory.kind}/${memory.riskLevel}/score=${memory.score}/matchedOn=${matchedOn}: ${memory.summary}`;
    })
    .join(" | ");

  return [
    "Relevant workflow memory requires human review.",
    memorySummary,
    "Use memory only for routing and reviewer verification. Do not use memory as final claim evidence.",
  ].join(" ");
}

async function markMemoryHitsUsedByAgent(input: {
  runId: string;
  agentActionLogId: string;
  context: ClaimStateForAgent;
}): Promise<string[]> {
  const memoryHitIds = getMemoryHitIds(input.context);

  if (memoryHitIds.length === 0) {
    return [];
  }

  await prisma.memoryHit.updateMany({
    where: {
      id: {
        in: memoryHitIds,
      },
      runId: input.runId,
    },
    data: {
      usedByAgent: true,
      agentActionLogId: input.agentActionLogId,
    },
  });

  return memoryHitIds;
}

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

    

   if (context.requiredEvidence.length > 0 || context.missingFields.length > 0) {
        const claimNumber = getStringField(context.extractedJson, "claimNumber");
        const recipientLabel =
            getStringField(context.extractedJson, "claimantName") ??
            getStringField(context.extractedJson, "insuredName");

        const fieldRequests = buildFieldRequests(context.missingFields);

        const parts: string[] = [];

        if (context.requiredEvidence.length > 0) {
            parts.push(`required evidence is missing: ${formatList(context.requiredEvidence)}`);
        }

        if (context.missingFields.length > 0) {
            parts.push(`required extracted fields are missing: ${formatList(context.missingFields)}`);
        }

        return {
            runId: context.runId,
            action: "DRAFT_INFORMATION_REQUEST",
            rationale: parts.join("; "),
            toolName: "draft_information_request",
            toolInputJson: {
            runId: context.runId,
            requestedEvidence: context.requiredEvidence,
            requestedFields: context.missingFields,
            fieldRequests,
            claimNumber,
            recipientLabel,
            },
        };
    }

    const memoryEscalationReason = getMemoryEscalationReason(context);

    if (memoryEscalationReason) {
    return {
        runId: context.runId,
        action: "ESCALATE_TO_HUMAN",
        rationale: memoryEscalationReason,
        toolName: "escalate_to_human",
        toolInputJson: {
        runId: context.runId,
        reason: memoryEscalationReason,
        priority: "HIGH",
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

    const usedMemoryHitIds = await markMemoryHitsUsedByAgent({
        runId,
        agentActionLogId: proposedLog.id,
        context,
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
                usedMemoryHitIds,
                relevantMemoryCount: context.relevantMemories.length,
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

    if (
        (proposedAction.action === "DRAFT_INFORMATION_REQUEST" ||
            proposedAction.action === "DRAFT_FOLLOWUP_REQUEST") &&
        toolSucceeded
        ) {
        deterministicPostActionOutput = await markNeedsMoreInfoTool.invoke({
            runId,
            missingEvidence: getMissingEvidenceForPostAction({
            context,
            proposedAction,
            }),
            missingFields: context.missingFields,
            note: "Deterministic post-action after information request draft creation.",
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
                (proposedAction.action === "DRAFT_INFORMATION_REQUEST" ||
                    proposedAction.action === "DRAFT_FOLLOWUP_REQUEST") &&
                toolSucceeded
                    ? "MARK_NEEDS_MORE_INFO"
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
import { ProposedAgentActionSchema, type ProposedAgentAction, type AgentActionType } from "@repo/shared/schemas";

const TOOL_NAME_TO_ACTION = {
    retrieve_policy_clauses : "RETRIEVE_POLICY_CLAUSES",
    create_review_task : "CREATE_REVIEW_TASK",
    draft_followup_request : "DRAFT_FOLLOWUP_REQUEST",
    mark_needs_more_evidence : "MARK_NEEDS_MORE_EVIDENCE",
    escalate_to_human : "ESCALATE_TO_HUMAN",
    draft_approval_note : "DRAFT_APPROVAL_NOTE",
    draft_denial_reason : "DRAFT_DENIAL_REASON",
    ask_clarification : "ASK_CLARIFICATION",
    no_action: "NO_ACTION",
} satisfies Record<string, AgentActionType>;

type ClaimflowToolName = keyof typeof TOOL_NAME_TO_ACTION;

function isClaimflowToolName(value: string): value is ClaimflowToolName {
  return value in TOOL_NAME_TO_ACTION;
}

type toolCallLike = {
    name? : unknown;
    args? : unknown;
};

// Represents AI message returned by Langchain
type MessageWithToolCalls = {
    tool_calls? : unknown;
    content? : unknown;
    kwargs?: {
        tool_calls? : unknown;
    }
};

function isRecord(value : unknown) : value is Record<string,unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeToolCalls(message : unknown): toolCallLike[]{
    if(!isRecord(message)){
        return [];
    }

    const directToolCalls = (message as MessageWithToolCalls).tool_calls;

    if(Array.isArray(directToolCalls)){
        return directToolCalls.filter(isRecord).map((toolCall) => ({
            name : toolCall.name,
            args : toolCall.args,
        }));
    }

    return [];
}

function getMessageContent(message : unknown) : string | undefined {
    if(!isRecord(message)){
        return undefined;
    }

    const content = (message as MessageWithToolCalls).content;

    if(typeof content === "string" && content.trim().length > 0){
        return content.trim();
    }

    if(Array.isArray(content)){
        const textParts = content
        .map((part) => {
            if(typeof part === "string"){
                return part;
            }

            if(isRecord(part) && typeof part.text === "string"){
                return part.text;
            }
            return null;
        })
        .filter((part) : part is string => Boolean(part));

        if(textParts.length > 0){
            return textParts.join("\n").trim();
        }
    }
    return undefined;
}

export function parseAgentToolCall(input : {
    runId : string;
    message : unknown;
}) : ProposedAgentAction {
    const toolCalls = normalizeToolCalls(input.message);

    if(toolCalls.length === 0){
        return ProposedAgentActionSchema.parse({
            runId : input.runId,
            action : "NO_ACTION",
            rationale : getMessageContent(input.message) ?? "The agent did not propose a tool call.",
            toolName : null,
            toolInputJson : null,
        });
    }

    if(toolCalls.length > 1){
        throw new Error(`Expected exactly one agent tool call, recieved ${toolCalls.length}`);
    }

    const toolCall = toolCalls[0];
    if(!toolCall){
        throw new Error("Expected one agent tool call recieved none");
    }

    if(typeof toolCall.name !== "string"){
        throw new Error("Agent tool call is missing a string tool name.")
    }

    const normalizedToolName = toolCall.name.trim().toLowerCase();

    if(!isClaimflowToolName(normalizedToolName)){
        throw new Error(`Unknown or unsafe agent tool call: ${toolCall.name}`);
    }

    const action = TOOL_NAME_TO_ACTION[normalizedToolName];

    return ProposedAgentActionSchema.parse({
        runId : input.runId,
        action,
        rationale: getMessageContent(input.message) ?? `Agent proposed tool ${toolCall.name}`,
        toolName : normalizedToolName,
        toolInputJson : toolCall.args ?? {}
    });
}

export { TOOL_NAME_TO_ACTION };
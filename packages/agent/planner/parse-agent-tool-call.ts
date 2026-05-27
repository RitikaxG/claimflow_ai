import type { AgentActionType } from "@repo/db";

const TOOL_NAME_TO_ACTION = {
    retrieve_policy_clauses : "RETRIEVE_POLICY_CLAUSES",
    create_review_task : "CREATE_REVIEW_TASK",
    draft_followup_request : "DRAFT_FOLLOWUP_REQUEST",
    mark_needs_more_evidence : "MARK_NEEDS_MORE_EVIDENCE",
    esclalate_to_human : "ESCALATE_TO_HUMAN",
    draft_approval_note : "DRAFT_APPROVAL_NOTE",
    draft_denial_reason : "DRAFT_DENIAL_REASON",
    ask_clarification : "ASK_CLARIFICATION",
} satisfies Record<string, AgentActionType>;

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

    
}
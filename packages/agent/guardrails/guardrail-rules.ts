import type { AgentActionType, ClaimStateForAgent, ProposedAgentAction } from "@repo/shared/schemas";

export type GuardrailEvaluation = {
    decision : "ALLOWED" | "BLOCKED",
    reason : string;
    ruleId : string;
};

const DECISION_DRAFT_ACTIONS : AgentActionType[] = [
    "DRAFT_APPROVAL_NOTE",
    "DRAFT_DENIAL_REASON"
];

const UNSAFE_FINAL_TOOL_NAMES = new Set([
    "approve_claim",
    "reject_claim",
    "send_email",
    "create_final_summary",
    "create_final_decision",
    "bypass_review",
    "delete_claim",
]);

function isDecisionDraftAction(action : AgentActionType): boolean {
    return DECISION_DRAFT_ACTIONS.includes(action);
};

function isUnsafeFinalToolName(toolName : string | null | undefined): boolean {
    if(!toolName){
        return false;
    }

    return UNSAFE_FINAL_TOOL_NAMES.has(toolName.trim().toLowerCase());
};

export function evaluateGuardrailRules(input : {
    context : ClaimStateForAgent,
    proposedAction : ProposedAgentAction
}) : GuardrailEvaluation {
    const { context, proposedAction } = input;
    const action = proposedAction.action;

    if(isUnsafeFinalToolName(proposedAction.toolName)){
        return {
            decision : "BLOCKED",
            ruleId : "unsafe_final_tool_blocked",
            reason : "Unsafe final claim action blocked. The agent cannot approve, reject, send email, bypass review, or create final decisions."
        };
    }

    if(action === "DRAFT_APPROVAL_NOTE" && context.missingFields.length > 0){
        return {
            decision : "BLOCKED",
            ruleId : "missing_fields_block_approval",
            reason : "Cannot draft approval note while required extracted fields are missing."
        };
    }

    if(action === "DRAFT_APPROVAL_NOTE" && context.requiredEvidence.length > 0){
        return {
            decision : "BLOCKED",
            ruleId : "missing_evidence_block_approval",
            reason : "Cannot draft approval note while required evidence is missing",
        };
    }

    if(context.latestRetrievalStatus === "INSUFFICIENT_EVIDENCE" && isDecisionDraftAction(action)){
        return {
            decision : "BLOCKED",
            ruleId : "insufficient_policy_evidence_block_decision_draft",
            reason : "Cannot draft approval or denial reasoning while policy retrieval has insufficient evidence."
        };
    }

    if(context.documentMismatchSignals.length > 0 && isDecisionDraftAction(action)){
        return {
            decision : "BLOCKED",
            ruleId : "document_mismatch_block_decision_darft",
            reason : "Document mismatch signals require human escalation before decision drafting."
        };
    }

    if(context.duplicateSignals.length > 0 &&
        !["ASK_CLARIFICATION","ESCALATE_TO_HUMAN","NO_ACTION"].includes(action)
    ){
        return {
            decision : "BLOCKED",
            ruleId : "duplicate_signal_block_processing",
            reason : "Duplicate document signals block normal processing; only clarification or human escalation is allowed."
        };
    }

    if(context.retryCount >= 3 &&
        !["ESCALATE_TO_HUMAN","CREATE_REVIEW_TASK","NO_ACTION"].includes(action)
    ){
        return {
            decision : "BLOCKED",
            ruleId : "retry_limit_exceeded",
            reason : "Retry limit exceeded; route to human review instead of continuing automated processing.",
        };
    }

    if(action === "DRAFT_DENIAL_REASON" && !context.hasPolicyEvidence){
        return {
            decision : "BLOCKED",
            ruleId : "denial_requires_policy_evidence",
            reason : "Draft denial reason requires policy evidence.",
        }
    };

    return {
        decision : "ALLOWED",
        ruleId : "default_allow_safe_agent_action",
        reason : "Action is allowed by ClaimFlow guardrails."
    }
}

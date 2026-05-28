import type { ClaimStateForAgent, ProposedAgentAction } from "@repo/shared/schemas";
import { evaluateGuardrailRules, type GuardrailEvaluation } from "./guardrail-rules";
import { getActionPermission } from "./action-permission-matrix";

export function evaluateAgentAction(input : {
    context : ClaimStateForAgent,
    proposedAction : ProposedAgentAction,
}): GuardrailEvaluation {
    const permission = getActionPermission(input.proposedAction.action);

    if(permission.permission === "BLOCK"){
        return {
            decision : "BLOCKED",
            ruleId : "permission_matrix_block",
            reason : permission.reason,
        }
    };

    return evaluateGuardrailRules(input);
}
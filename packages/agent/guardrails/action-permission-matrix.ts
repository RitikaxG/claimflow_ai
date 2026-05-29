import type { AgentActionType } from "@repo/shared/schemas";

export type PermissionLevel = "ALLOW" | "BLOCK" | "CONDITIONAL";

export type ActionPermissionRule = {
    permission : PermissionLevel,
    reason : string,
};

export const ACTION_PERMISSION_MATRIX : Record<
AgentActionType,
ActionPermissionRule
> = {
    RETRIEVE_POLICY_CLAUSES : {
        permission : "ALLOW",
        reason : "Read-only policy retrieval is safe.",
    },
    CREATE_REVIEW_TASK : {
        permission : "ALLOW",
        reason : "Creates or reuses a human review task."
    },
    REQUEST_MISSING_DOCUMENT : {
        permission : "ALLOW",
        reason : "Requests missing evidence but does not approve or deny claim.",
    },
    MARK_NEEDS_MORE_EVIDENCE : {
        permission : "ALLOW",
        reason : "Moves review workflow towards more information."
    },
    DRAFT_FOLLOWUP_REQUEST: {
        permission : "ALLOW",
        reason : "Draft-only action. Does not send email."
    },
    DRAFT_APPROVAL_NOTE : {
        permission : "CONDITIONAL",
        reason : "Allowed only when required evidence is complete and policy evidence is sufficient."
    },
    DRAFT_DENIAL_REASON : {
        permission : "CONDITIONAL",
        reason : "Allowed only when supported by policy evidence or human escalation context."
    },
    ESCALATE_TO_HUMAN : {
        permission : "ALLOW",
        reason : "Safe fallback when confidence/evidence is weak",
    },
    ASK_CLARIFICATION : {
        permission : "ALLOW",
        reason : "Safe non-final clarification action."
    },
    NO_ACTION: {
        permission : "ALLOW",
        reason : "Safe no-op."
    },
    MARK_NEEDS_MORE_INFO: {
        permission: "ALLOW",
        reason: "Moves review workflow toward missing information resolution.",
    },

    DRAFT_INFORMATION_REQUEST: {
        permission: "ALLOW",
        reason:
            "Draft-only action for missing claim information or evidence. Does not send email.",
    },
};

export function getActionPermission(
    action : AgentActionType
): ActionPermissionRule {
    return ACTION_PERMISSION_MATRIX[action];
}
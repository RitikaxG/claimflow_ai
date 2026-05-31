import type {
  AgentActionType,
  ClaimStateForAgent,
  ProposedAgentAction,
} from "@repo/shared/schemas";

export type GuardrailEvaluation = {
  decision: "ALLOWED" | "BLOCKED";
  reason: string;
  ruleId: string;
};

const DECISION_DRAFT_ACTIONS: AgentActionType[] = [
  "DRAFT_APPROVAL_NOTE",
  "DRAFT_DENIAL_REASON",
];

const FINAL_REVIEW_TASK_STATUSES = new Set([
  "APPROVED",
  "EDITED_AND_APPROVED",
  "REJECTED",
]);

const REVIEW_MUTATING_ACTIONS: AgentActionType[] = [
  "CREATE_REVIEW_TASK",
  "MARK_NEEDS_MORE_EVIDENCE",
  "MARK_NEEDS_MORE_INFO",
  "DRAFT_FOLLOWUP_REQUEST",
  "DRAFT_INFORMATION_REQUEST",
  "DRAFT_APPROVAL_NOTE",
  "DRAFT_DENIAL_REASON",
  "ESCALATE_TO_HUMAN",
  "ASK_CLARIFICATION",
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDecisionDraftAction(action: AgentActionType): boolean {
  return DECISION_DRAFT_ACTIONS.includes(action);
}

function isUnsafeFinalToolName(toolName: string | null | undefined): boolean {
  if (!toolName) {
    return false;
  }

  return UNSAFE_FINAL_TOOL_NAMES.has(toolName.trim().toLowerCase());
}

function isFinalReviewTaskStatus(status: string | null): boolean {
  return status !== null && FINAL_REVIEW_TASK_STATUSES.has(status);
}

function hasValidationConflicts(context: ClaimStateForAgent): boolean {
  if (!isRecord(context.validationJson)) {
    return false;
  }

  const conflicts = context.validationJson.conflicts;

  return Array.isArray(conflicts) && conflicts.length > 0;
}

function hasPolicyExclusionSignal(context: ClaimStateForAgent): boolean {
  if (context.coverageDecision === "NOT_COVERED") {
    return true;
  }

  if (!isRecord(context.validationJson)) {
    return false;
  }

  return (
    context.validationJson.policyExclusionDetected === true ||
    context.validationJson.coverageOutcome === "POLICY_EXCLUSION"
  );
}

export function evaluateGuardrailRules(input: {
  context: ClaimStateForAgent;
  proposedAction: ProposedAgentAction;
}): GuardrailEvaluation {
  const { context, proposedAction } = input;
  const action = proposedAction.action;

  if (isUnsafeFinalToolName(proposedAction.toolName)) {
    return {
      decision: "BLOCKED",
      ruleId: "unsafe_final_tool_blocked",
      reason:
        "Unsafe final claim action blocked. The agent cannot approve, reject, send email, bypass review, delete claims, or create final decisions.",
    };
  }

  if (
    isFinalReviewTaskStatus(context.reviewTaskStatus) &&
    REVIEW_MUTATING_ACTIONS.includes(action)
  ) {
    return {
      decision: "BLOCKED",
      ruleId: "final_review_task_blocks_agent_mutation",
      reason: `Review task is already final with status ${context.reviewTaskStatus}. Agent cannot create follow-ups, mutate review state, escalate, or draft decision notes for a final review task.`,
    };
  }

  if (action === "DRAFT_APPROVAL_NOTE" && !context.hasPolicyEvidence) {
    return {
      decision: "BLOCKED",
      ruleId: "approval_requires_policy_evidence",
      reason:
        "Cannot draft approval note until policy evidence has been retrieved and is sufficient.",
    };
  }

  if (action === "DRAFT_APPROVAL_NOTE" && hasPolicyExclusionSignal(context)) {
    return {
      decision: "BLOCKED",
      ruleId: "policy_exclusion_blocks_approval",
      reason:
        "Cannot draft approval note when policy evidence indicates the claim is not covered or has an exclusion signal.",
    };
  }

  if (hasValidationConflicts(context) && isDecisionDraftAction(action)) {
    return {
      decision: "BLOCKED",
      ruleId: "validation_conflicts_block_decision_draft",
      reason:
        "Validation conflicts require human review before approval or denial drafting.",
    };
  }

  if (action === "DRAFT_APPROVAL_NOTE" && context.missingFields.length > 0) {
    return {
      decision: "BLOCKED",
      ruleId: "missing_fields_block_approval",
      reason:
        "Cannot draft approval note while required extracted fields are missing.",
    };
  }

  if (action === "DRAFT_APPROVAL_NOTE" && context.requiredEvidence.length > 0) {
    return {
      decision: "BLOCKED",
      ruleId: "missing_evidence_block_approval",
      reason:
        "Cannot draft approval note while required evidence is missing.",
    };
  }

  if (
    context.latestRetrievalStatus === "INSUFFICIENT_EVIDENCE" &&
    isDecisionDraftAction(action)
  ) {
    return {
      decision: "BLOCKED",
      ruleId: "insufficient_policy_evidence_block_decision_draft",
      reason:
        "Cannot draft approval or denial reasoning when policy retrieval has insufficient evidence.",
    };
  }

  if (
    context.documentMismatchSignals.length > 0 &&
    isDecisionDraftAction(action)
  ) {
    return {
      decision: "BLOCKED",
      ruleId: "document_mismatch_block_decision_draft",
      reason:
        "Document mismatch signals require human escalation before decision drafting.",
    };
  }

  if (
    context.duplicateSignals.length > 0 &&
    !["ASK_CLARIFICATION", "ESCALATE_TO_HUMAN", "NO_ACTION"].includes(action)
  ) {
    return {
      decision: "BLOCKED",
      ruleId: "duplicate_signal_block_processing",
      reason:
        "Duplicate document signals block normal processing; only clarification or human escalation is allowed.",
    };
  }

  if (
    context.retryCount >= 3 &&
    !["ESCALATE_TO_HUMAN", "CREATE_REVIEW_TASK", "NO_ACTION"].includes(action)
  ) {
    return {
      decision: "BLOCKED",
      ruleId: "retry_limit_exceeded",
      reason:
        "Retry limit exceeded; route to human review instead of continuing automated processing.",
    };
  }

  if (action === "DRAFT_DENIAL_REASON" && !context.hasPolicyEvidence) {
    return {
      decision: "BLOCKED",
      ruleId: "denial_requires_policy_evidence",
      reason: "Draft denial reason requires policy evidence.",
    };
  }

  return {
    decision: "ALLOWED",
    ruleId: "default_allow_safe_agent_action",
    reason: "Action is allowed by ClaimFlow guardrails.",
  };
}
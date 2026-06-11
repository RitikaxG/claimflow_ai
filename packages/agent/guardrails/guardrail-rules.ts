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

type AgentRelevantMemory = ClaimStateForAgent["relevantMemories"][number];

const ENTITY_RISK_MEMORY_KINDS = new Set([
  "PRIOR_REJECTION",
  "CLAIMANT_PATTERN",
  "VENDOR_PATTERN"
]);

const FIELD_OR_EVIDENCE_MATCH_TYPES = new Set([
  "SAME_FIELD",
  "MISSING_FIELD_MATCH",
  "REQUIRED_EVIDENCE_MATCH",
  "PATTERN_FULL_MATCH",
  "PATTERN_PARTIAL_MATCH",
]);

const REVIEW_RELEVANT_MEMORY_KINDS = new Set([
  "HUMAN_CORRECTION",
  "PRIOR_REVIEW_DECISION",
  "POLICY_HISTORY",
  "RECURRING_ERROR_PATTERN",
]);

function getRelevantMemories(context : ClaimStateForAgent): AgentRelevantMemory[] {
  return context.relevantMemories ?? [];
}

function hasFieldOrEvidenceMatch(memory : AgentRelevantMemory) : boolean {
  return memory.matchedOn.some((signal) =>
  FIELD_OR_EVIDENCE_MATCH_TYPES.has(signal.type)
  );
}

function shouldEscalateBecauseOfMemory(memory: AgentRelevantMemory): boolean {
  if(memory.status === "RETIRED" || memory.status === "SUPERSEDED"){
    return false;
  };

  // Any high risk relevant memory should route to human review
  if(memory.riskLevel === "HIGH"){
    return true;
  }

  // Field/evidence memories escalate only when the match is strong enough.
  // Example:
  // - prior human correction on policyNumber
  // - recurring requiredEvidence missing pattern
  // - prior review decision on claim form / repair invoice / FIR
  if(
    REVIEW_RELEVANT_MEMORY_KINDS.has(memory.kind) &&
    hasFieldOrEvidenceMatch(memory) &&
    memory.score >= 30 &&
    memory.confidence >= 0.6
  ){
    return true;
  }
  return false;
}

function getEscalationWorthyMemories(
  context : ClaimStateForAgent
): AgentRelevantMemory[]{
  return getRelevantMemories(context).filter(shouldEscalateBecauseOfMemory);
};

function hasHighRiskMemory(context: ClaimStateForAgent): boolean {
  return getRelevantMemories(context).some(
    (memory) =>
      memory.riskLevel === "HIGH" &&
      memory.status !== "RETIRED" &&
      memory.status !== "SUPERSEDED",
  );
}

function hasPriorRejectionMemory(context: ClaimStateForAgent): boolean {
  return getRelevantMemories(context).some(
    (memory) => memory.kind === "PRIOR_REJECTION",
  );
}

function hasMemoryEscalationSignal(context : ClaimStateForAgent): boolean {
  return getEscalationWorthyMemories(context).length > 0;
}

function stringifyForGuardrail(value : unknown): string {
  try{
    return JSON.stringify(value ?? {}).toLowerCase()
  }catch{
    return "";
  }
}

function proposedActionMentionsMemory(
  proposedAction : ProposedAgentAction
): boolean {
  const rationale = proposedAction.rationale?.toLowerCase() ?? "";
  const toolInput = stringifyForGuardrail(proposedAction.toolInputJson);

  return (
    rationale.includes("memory") ||
    rationale.includes("prior rejection") ||
    rationale.includes("prior correction") ||
    rationale.includes("previous correction") ||
    rationale.includes("past correction") ||
    toolInput.includes("memory") ||
    toolInput.includes("prior rejection") ||
    toolInput.includes("prior correction") ||
    toolInput.includes("previous correction") ||
    toolInput.includes("past correction")
  )
};

function isMemoryOverwriteAttempt(
  proposedAction: ProposedAgentAction,
): boolean {
  const toolInput = proposedAction.toolInputJson;

  if (!isRecord(toolInput)) {
    return false;
  }

  const unsafeMutationKeys = [
    "correctedJson",
    "extractedJson",
    "replaceCurrentExtraction",
    "replace_current_extraction",
    "autoCorrect",
    "auto_correct",
    "overwriteFields",
    "overwrite_fields",
  ];

  return unsafeMutationKeys.some((key) => key in toolInput);
}

function hasMemoryConflictWithCurrentEvidence(
  context: ClaimStateForAgent,
): boolean {
  if (!context.hasPolicyEvidence) {
    return false;
  }

  // Example:
  // current RAG says COVERED, but memory says same claimant/vendor/pattern is risky.
  // Do not let the agent draft approval. Route to human review.
  if (
    context.coverageDecision === "COVERED" &&
    hasMemoryEscalationSignal(context)
  ) {
    return true;
  }

  return false;
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

  if (isMemoryOverwriteAttempt(proposedAction)) {
    return {
      decision: "BLOCKED",
      ruleId: "memory_overwrite_attempt_blocked",
      reason:
        "Memory cannot overwrite extractedJson, correctedJson, or current claim fields. Memory may only guide routing or reviewer verification.",
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

  if (action === "DRAFT_APPROVAL_NOTE" && hasHighRiskMemory(context)) {
  return {
    decision: "BLOCKED",
    ruleId: "high_risk_memory_blocks_approval",
    reason:
      "High-risk workflow memory cannot be used to approve a claim. Route to human review instead.",
  };
}

  if (action === "DRAFT_APPROVAL_NOTE" && hasPriorRejectionMemory(context)) {
    return {
      decision: "BLOCKED",
      ruleId: "prior_rejection_memory_blocks_approval",
      reason:
        "Prior rejection memory cannot be ignored during approval drafting. Route to human review instead.",
    };
  }

  if (
    isDecisionDraftAction(action) &&
    hasMemoryConflictWithCurrentEvidence(context)
  ) {
    return {
      decision: "BLOCKED",
      ruleId: "memory_conflict_requires_human_review",
      reason:
        "Relevant workflow memory conflicts with current claim or policy evidence. Escalate to human review instead of drafting a decision note.",
    };
  }

  if (
    action === "DRAFT_DENIAL_REASON" &&
    proposedActionMentionsMemory(proposedAction) &&
    context.coverageDecision !== "NOT_COVERED"
  ) {
    return {
      decision: "BLOCKED",
      ruleId: "memory_only_denial_blocked",
      reason:
        "Memory cannot be the basis for denial reasoning. Denial drafting requires current policy evidence with a NOT_COVERED decision.",
    };
  }

  return {
    decision: "ALLOWED",
    ruleId: "default_allow_safe_agent_action",
    reason: "Action is allowed by ClaimFlow guardrails.",
  };
}
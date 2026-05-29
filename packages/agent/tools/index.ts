export { askClarificationTool } from "./ask-clarification.tool";
export { createReviewTaskTool } from "./create-review-task.tool";
export { draftApprovalNoteTool } from "./draft-approval-note.tool";
export { draftDenialReasonTool } from "./draft-denial-reason.tool";
export { draftFollowupRequestTool } from "./draft-followup-request.tool";
export { escalateToHumanTool } from "./escalate-to-human.tool";
export { markNeedsMoreEvidenceTool } from "./mark-needs-more-evidence.tool";
export { noActionTool } from "./no-action.tool";
export { retrievePolicyClausesTool } from "./retrieve-policy-clauses.tool";
export { draftInformationRequestTool } from "./draft-information-request.tool";
export { markNeedsMoreInfoTool } from "./mark-needs-more-info.tool";

export { getErrorMessage, okToolResult, failedToolResult } from "./tool-result";
export type { ClaimflowToolResult } from "./tool-result";

import { askClarificationTool } from "./ask-clarification.tool";
import { createReviewTaskTool } from "./create-review-task.tool";
import { draftApprovalNoteTool } from "./draft-approval-note.tool";
import { draftDenialReasonTool } from "./draft-denial-reason.tool";
import { draftFollowupRequestTool } from "./draft-followup-request.tool";
import { escalateToHumanTool } from "./escalate-to-human.tool";
import { markNeedsMoreEvidenceTool } from "./mark-needs-more-evidence.tool";
import { noActionTool } from "./no-action.tool";
import { retrievePolicyClausesTool } from "./retrieve-policy-clauses.tool";
import { draftInformationRequestTool } from "./draft-information-request.tool";
import { markNeedsMoreInfoTool } from "./mark-needs-more-info.tool";

export const claimflowTools = [
  retrievePolicyClausesTool,
  createReviewTaskTool,
  draftInformationRequestTool,
  draftFollowupRequestTool,
  markNeedsMoreInfoTool,
  markNeedsMoreEvidenceTool,
  escalateToHumanTool,
  draftApprovalNoteTool,
  draftDenialReasonTool,
  askClarificationTool,
  noActionTool,
] as const;
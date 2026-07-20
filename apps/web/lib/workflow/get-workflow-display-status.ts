export function getWorkflowDisplayStatus(run: {
  status: string;
  reviewTask?: { status: string } | null;
}) {
  const reviewStatus = run.reviewTask?.status;

  // A human decision is the terminal product state even though the underlying
  // extraction run may already be marked complete.
  if (reviewStatus === "APPROVED") return "HUMAN_APPROVED";
  if (reviewStatus === "EDITED_AND_APPROVED") {
    return "HUMAN_EDITED_AND_APPROVED";
  }
  if (reviewStatus === "REJECTED") return "HUMAN_REJECTED";
  if (reviewStatus === "NEEDS_MORE_INFO") return "NEEDS_MORE_INFO";
  if (reviewStatus === "IN_REVIEW") return "IN_HUMAN_REVIEW";

  if (run.status === "FAILED") return "FAILED";
  if (run.status === "COMPLETED") return "AI_COMPLETED";
  if (run.status === "UPLOADED") return "UPLOADED";
  if (run.status === "EXTRACTING") return "EXTRACTING";
  if (run.status === "VALIDATING") return "VALIDATING";

  if (run.status === "NEEDS_REVIEW") {
    if (!run.reviewTask) return "NEEDS_REVIEW";
    if (reviewStatus === "PENDING") return "REVIEW_PENDING";
  }

  return run.status;
}

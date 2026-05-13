import type { ReviewTaskStatus } from "../../store/use-dashboard-store";

const statusClassName: Record<ReviewTaskStatus, string> = {
  PENDING: "bg-gray-100 text-gray-700 ring-gray-200",
  IN_REVIEW: "bg-blue-100 text-blue-700 ring-blue-200",
  APPROVED: "bg-green-100 text-green-700 ring-green-200",
  EDITED_AND_APPROVED: "bg-green-100 text-green-700 ring-green-200",
  REJECTED: "bg-red-100 text-red-700 ring-red-200",
  NEEDS_MORE_INFO: "bg-orange-100 text-orange-700 ring-orange-200",
};

type ReviewTaskStatusBadgeProps = {
  status: ReviewTaskStatus;
};

export function ReviewTaskStatusBadge({ status }: ReviewTaskStatusBadgeProps) {
  return (
    <span
      className={`inline-flex whitespace-nowrap items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusClassName[status]}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
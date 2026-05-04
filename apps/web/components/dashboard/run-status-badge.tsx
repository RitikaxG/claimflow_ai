import type { RunStatus } from "../../store/use-dashboard-store"

const statusClassName: Record<RunStatus, string> = {
  UPLOADED: "bg-gray-100 text-gray-700 ring-gray-200",
  EXTRACTING: "bg-blue-100 text-blue-700 ring-blue-200",
  VALIDATING: "bg-yellow-100 text-yellow-800 ring-yellow-200",
  COMPLETED: "bg-green-100 text-green-700 ring-green-200",
  NEEDS_REVIEW: "bg-orange-100 text-orange-700 ring-orange-200",
  FAILED: "bg-red-100 text-red-700 ring-red-200",
};

type RunStatusBadgeProps = {
  status: RunStatus;
};

export function RunStatusBadge({ status }: RunStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusClassName[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
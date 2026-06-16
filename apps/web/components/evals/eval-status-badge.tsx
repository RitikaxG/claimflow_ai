type Props = {
  status: string;
};

export function EvalStatusBadge({ status }: Props) {
  const classes =
    status === "PASSED"
      ? "border-green-200 bg-green-50 text-green-700"
      : status === "WARNING"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-red-200 bg-red-50 text-red-700";

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${classes}`}>
      {status}
    </span>
  );
}
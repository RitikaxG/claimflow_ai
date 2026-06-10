type MemoryStatusBadgeProps = {
  status: string;
};

export function MemoryStatusBadge({ status }: MemoryStatusBadgeProps) {
  const className =
    status === "STRENGTHENED"
      ? "border-green-200 bg-green-50 text-green-700"
      : status === "WEAKENED"
        ? "border-yellow-200 bg-yellow-50 text-yellow-700"
        : status === "RETIRED" || status === "SUPERSEDED"
          ? "border-gray-200 bg-gray-100 text-gray-500"
          : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
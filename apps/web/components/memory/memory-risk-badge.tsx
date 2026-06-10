type MemoryRiskBadgeProps = {
  riskLevel: string;
};

export function MemoryRiskBadge({ riskLevel }: MemoryRiskBadgeProps) {
  const className =
    riskLevel === "HIGH"
      ? "border-red-200 bg-red-50 text-red-700"
      : riskLevel === "MEDIUM"
        ? "border-orange-200 bg-orange-50 text-orange-700"
        : "border-gray-200 bg-gray-50 text-gray-700";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {riskLevel.replaceAll("_", " ")} risk
    </span>
  );
}
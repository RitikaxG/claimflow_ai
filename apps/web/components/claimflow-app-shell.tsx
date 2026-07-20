import Link from "next/link";

export function ClaimFlowLogo() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--cf-navy)] text-xs font-bold text-white shadow-sm">
        CF
      </div>
      <div>
        <p className="text-sm font-semibold tracking-tight text-[var(--cf-navy)]">ClaimFlow AI</p>
        <p className="text-xs text-[var(--cf-muted)]">Motor claims workflow</p>
      </div>
    </Link>
  );
}

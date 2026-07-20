import Link from "next/link";

export function ClaimFlowMark({ className = "h-11 w-11", inverse = false }: { className?: string; inverse?: boolean }) {
  const primary = inverse ? "#f7fffc" : "#0b5b55";
  const accent = inverse ? "#91decf" : "#55bda9";

  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 48 52" fill="none">
      <path d="M33.8 21.5c-2.7-4-6.6-6-11.2-6-8.2 0-14 6.7-14 15.4 0 8.6 5.8 15.1 14 15.1 5 0 9.4-2.3 12.4-6.5" stroke={primary} strokeWidth="7" strokeLinecap="round" />
      <path d="M22.5 15.4V7.1M22.5 9.5c-4.2-4-7.7-4.4-10.4-3.1M22.6 11.4c4.2-4 8-4.4 10.7-3.1" stroke={accent} strokeWidth="1.9" strokeLinecap="round" />
      <path d="M12 6.4c2.8-.6 4.7.6 5.7 3.3-2.8.7-4.7-.4-5.7-3.3ZM33.4 8.2c-2.8-.6-4.7.6-5.7 3.3 2.8.7 4.7-.4 5.7-3.3ZM18.5 4.4c2.5.2 3.8 1.7 4 4.2-2.5-.1-3.8-1.5-4-4.2ZM27.1 3.8c-2.4.4-3.5 2-3.5 4.5 2.4-.3 3.6-1.8 3.5-4.5Z" fill={accent} />
    </svg>
  );
}

export function ClaimFlowBrand({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex min-w-0 items-center gap-2.5" aria-label="ClaimFlow home">
      <ClaimFlowMark className={compact ? "h-9 w-9" : "h-11 w-11"} inverse={inverse} />
      <span className={`cf-display truncate font-semibold tracking-[-0.03em] ${compact ? "text-xl" : "text-[1.7rem]"} ${inverse ? "text-white" : "text-[#123f3b]"}`}>
        ClaimFlow
      </span>
    </Link>
  );
}

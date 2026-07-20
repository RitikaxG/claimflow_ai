"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { SessionUser } from "../../lib/auth/token";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CF";
}

export function UserAccountControl({ collapsed = false }: { collapsed?: boolean }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/auth/session")
      .then((response) => response.json())
      .then((body: { user?: SessionUser | null }) => active && setUser(body.user ?? null))
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const label = useMemo(() => user?.name ?? "Claims reviewer", [user]);
  const signOut = async () => {
    setSigningOut(true);
    await fetch("/api/auth/sign-out", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <div className={`flex ${collapsed ? "flex-col items-center gap-2" : "items-center gap-2.5"}`}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#dcefea] text-xs font-semibold text-[#123f3b]">{initials(label)}</span>
      {!collapsed ? <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-[#20302e]">{label}</p><p className="truncate text-xs text-[#667571]">{user?.email === "demo@claimflow.local" ? "Demo workspace" : "Claims reviewer"}</p></div> : null}
      <button type="button" onClick={signOut} disabled={signingOut} title="Sign out" aria-label="Sign out" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#61736f] transition hover:bg-white hover:text-[#0b665e] disabled:opacity-50">
        <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17l5-5-5-5M15 12H3M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" /></svg>
      </button>
    </div>
  );
}

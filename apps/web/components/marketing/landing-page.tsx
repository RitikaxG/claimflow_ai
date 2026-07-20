"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { SessionUser } from "../../lib/auth/token";
import { ClaimFlowBrand, ClaimFlowMark } from "../brand/claimflow-brand";
import { LineIcon, type LineIconName } from "../ui/line-icon";

const navItems: Array<{ label: string; href: string; icon: LineIconName }> = [
  { label: "Product", href: "#product", icon: "folder" },
  { label: "How it works", href: "#how-it-works", icon: "cycle" },
  { label: "Safety", href: "#safety", icon: "shield" },
  { label: "Operations", href: "/evals", icon: "operations" },
];

const trustPoints = ["Human decision always", "Policy grounded", "Guardrails active", "Full audit trail"];

const journey: Array<{ icon: LineIconName; title: string; body: string }> = [
  { icon: "file-upload", title: "Receive claim", body: "Upload one PDF or paste an email." },
  { icon: "folder", title: "Prepare the case", body: "Organize facts and identify gaps." },
  { icon: "book", title: "Guide the next step", body: "Use policy evidence and reviewed outcomes." },
  { icon: "person", title: "Human decision", body: "Approve, correct or reject with confidence." },
  { icon: "cycle", title: "Improve safely", body: "Record feedback and preserve the audit trail." },
];

const safeguards: Array<{ icon: LineIconName; title: string; body: string }> = [
  { icon: "book", title: "Grounded guidance", body: "Answers stay connected to supporting policy evidence." },
  { icon: "shield", title: "Guarded next steps", body: "Actions remain limited, reviewable and under human control." },
  { icon: "cycle", title: "Learning from reviewed outcomes", body: "Useful prior patterns improve matching without becoming claim facts." },
];

function MobileMenu({ open, onClose, user }: { open: boolean; onClose: () => void; user: SessionUser | null }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  return (
    <div className={`fixed inset-0 z-[80] transition ${open ? "pointer-events-auto visible" : "pointer-events-none invisible"}`} aria-hidden={!open}>
      <button type="button" aria-label="Close navigation" onClick={onClose} className={`absolute inset-0 bg-[#102824]/35 backdrop-blur-[2px] transition-opacity ${open ? "opacity-100" : "opacity-0"}`} />
      <aside role="dialog" aria-modal="true" aria-label="Navigation" className={`absolute right-0 top-0 flex h-full w-[88%] max-w-[430px] flex-col bg-[#fffefb] shadow-[-24px_0_70px_rgba(19,55,51,0.16)] transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between border-b border-[#dce5e1] px-5 py-5">
          <ClaimFlowBrand compact />
          <button ref={closeButtonRef} type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full text-[#123f3b] hover:bg-[#eff8f5]" aria-label="Close menu"><LineIcon name="close" className="h-7 w-7" /></button>
        </div>
        <nav className="px-5 pt-5" aria-label="Mobile navigation">
          {navItems.map((item) => <Link key={item.label} href={item.href} onClick={onClose} className="flex min-h-20 items-center gap-5 border-b border-[#e2e9e6] px-2 text-[#123f3b]"><LineIcon name={item.icon} className="h-7 w-7 shrink-0" /><span className="cf-display flex-1 text-2xl">{item.label}</span><LineIcon name="chevron-right" className="h-6 w-6" /></Link>)}
        </nav>
        <div className="space-y-3 px-6 pt-8">
          {user ? <p className="mb-2 truncate text-center text-sm text-[#60746f]">Signed in as {user.name}</p> : null}
          <Link href={user ? "/dashboard" : "/sign-in"} onClick={onClose} className="flex h-12 items-center justify-center rounded-xl font-semibold text-[#145f58] hover:bg-[#eff8f5]">{user ? "Open dashboard" : "Sign in"}</Link>
          {!user ? <Link href="/sign-up" onClick={onClose} className="flex h-13 items-center justify-center rounded-xl bg-[#087b71] font-semibold text-white shadow-[0_10px_24px_rgba(8,123,113,0.16)]">Create account</Link> : null}
        </div>
        <div className="mt-auto p-6"><div className="flex items-center gap-4 rounded-2xl border border-[#cde1dc] bg-[#f0f9f6] p-5 text-[#174a45]"><LineIcon name="shield" className="h-9 w-9 shrink-0" /><p className="cf-display text-xl leading-7">Human decisions remain in control.</p></div></div>
      </aside>
    </div>
  );
}

function ClaimPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[670px] rounded-[22px] border border-[#cbd8d4] bg-[#fffefb] shadow-[0_24px_65px_rgba(24,61,57,0.13)]">
      <div className="flex items-center justify-between border-b border-[#dfe7e4] px-5 py-4"><ClaimFlowBrand compact /><div className="flex items-center gap-3 text-[#345b56]"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#dcefea] text-xs font-semibold">AM</span></div></div>
      <div className="p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="cf-display text-2xl text-[#143f3b] sm:text-3xl">Aarav Mehta · CF-20481</h3><span className="rounded-lg border border-[#efcea0] bg-[#fff7e8] px-3 py-1.5 text-xs font-medium text-[#9a6419]">Needs attention</span></div>
        <div className="mt-7 grid grid-cols-4 gap-2">
          {["Claim received", "Facts prepared", "Needs addressed", "Human decision"].map((label, index) => <div key={label} className="relative text-center"><div className={`relative z-10 mx-auto grid h-8 w-8 place-items-center rounded-full text-xs font-semibold ${index < 2 ? "bg-[#0b7a71] text-white" : index === 2 ? "bg-[#d69a2f] text-white" : "border border-[#cdd8d5] bg-white text-[#6c7d79]"}`}>{index < 2 ? "✓" : index + 1}</div>{index < 3 ? <span className="absolute left-[60%] top-4 h-px w-[80%] bg-[#ccd7d3]" /> : null}<p className="mt-2 text-[10px] font-medium text-[#34534f] sm:text-xs">{label}</p></div>)}
        </div>
        <div className="mt-7 grid gap-4 sm:grid-cols-[1fr_180px]">
          <div className="rounded-2xl border border-[#d7e1de] p-4"><h4 className="cf-display text-xl text-[#163f3b]">What needs your attention</h4><div className="mt-3 space-y-2">{[["Vehicle registration", "Front and rear photos are missing."],["Repair estimate", "Labour breakdown not provided."]].map(([title, body]) => <div key={title} className="flex items-center gap-3 rounded-xl border border-[#dfe6e4] px-3 py-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#e8f6f2] text-[#0c7067]"><LineIcon name="file-check" className="h-5 w-5" /></span><span className="min-w-0 flex-1"><strong className="block truncate text-xs text-[#244742]">{title}</strong><span className="block truncate text-[10px] text-[#71817e]">{body}</span></span><span className="rounded-md bg-[#fff4df] px-2 py-1 text-[10px] text-[#a66c16]">Missing</span></div>)}</div><div className="mt-3 flex h-10 items-center justify-center rounded-lg bg-[#086c64] text-xs font-semibold text-white">Review claim</div></div>
          <div className="space-y-3"><div className="rounded-2xl border border-[#cfe1dc] bg-[#f0f9f6] p-4"><LineIcon name="shield" className="h-7 w-7 text-[#0a6b63]" /><strong className="mt-3 block text-sm text-[#17443f]">Guardrails active</strong><p className="mt-1 text-[11px] leading-4 text-[#647873]">Actions are limited, reviewable and audited.</p></div><div className="rounded-2xl border border-[#cfe1dc] bg-[#f0f9f6] p-4"><LineIcon name="book" className="h-7 w-7 text-[#0a6b63]" /><strong className="mt-3 block text-sm text-[#17443f]">Policy evidence verified</strong><p className="mt-1 text-[11px] leading-4 text-[#647873]">Answers are grounded in verified sources.</p></div></div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage({ user }: { user: SessionUser | null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <main className="min-h-screen overflow-hidden bg-[#fffefb] text-[#173c39]">
      <header className="sticky top-0 z-50 border-b border-[#dfe6e3] bg-[#fffefb]/95 backdrop-blur">
        <div className="mx-auto flex h-[78px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <ClaimFlowBrand />
          <nav className="hidden items-center gap-2 lg:flex" aria-label="Primary navigation">{navItems.map((item) => <Link key={item.label} href={item.href} className="rounded-lg px-4 py-2 text-sm font-medium text-[#244a46] transition hover:bg-[#eff8f5] hover:text-[#08766d]">{item.label}</Link>)}</nav>
          <div className="hidden items-center gap-3 lg:flex">{!user ? <Link href="/sign-in" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#22504b] hover:bg-[#eff8f5]">Sign in</Link> : <span className="max-w-36 truncate text-sm text-[#61736f]">Hi, {user.name.split(" ")[0]}</span>}<Link href={user ? "/dashboard" : "/sign-up"} className="rounded-xl bg-[#087b71] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(8,123,113,0.16)] transition hover:bg-[#066a62]">{user ? "Open dashboard" : "Create account"}</Link></div>
          <button type="button" onClick={() => setMenuOpen(true)} className="grid h-11 w-11 place-items-center rounded-xl border border-[#d6e1dd] text-[#164944] lg:hidden" aria-label="Open navigation" aria-expanded={menuOpen}><LineIcon name="menu" className="h-6 w-6" /></button>
        </div>
      </header>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} user={user} />

      <section id="product" className="scroll-mt-24 border-b border-[#e2e8e5] px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
        <div className="mx-auto grid max-w-[1440px] items-center gap-14 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="max-w-[610px]">
            <span className="inline-flex rounded-full bg-[#dcefea] px-4 py-2 text-sm font-medium text-[#155e57]">AI-assisted motor claims review</span>
            <h1 className="cf-display mt-7 text-5xl font-semibold leading-[1.04] tracking-[-0.045em] text-[#123f3b] sm:text-6xl lg:text-[4.7rem]">Move every claim forward with clarity.</h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[#526964]">From intake to human decision, ClaimFlow organizes facts, surfaces missing evidence, grounds policy answers and keeps every AI action reviewable.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link href={user ? "/dashboard" : "/sign-in?next=/dashboard"} className="inline-flex h-13 items-center justify-center rounded-xl bg-[#087b71] px-6 font-semibold text-white shadow-[0_12px_25px_rgba(8,123,113,0.17)] hover:bg-[#066a62]">Open claims dashboard</Link><a href="#how-it-works" className="inline-flex h-13 items-center justify-center rounded-xl border border-[#176a62] bg-white px-6 font-semibold text-[#155e57] hover:bg-[#eff8f5]">See how it works</a></div>
            <div className="mt-12 grid gap-x-8 gap-y-4 sm:grid-cols-2">{trustPoints.map((point) => <div key={point} className="flex items-center gap-2.5 text-sm text-[#48615c]"><span className="grid h-5 w-5 place-items-center rounded-full border border-[#159286] text-[#0e8076]"><LineIcon name="check" className="h-3.5 w-3.5" /></span>{point}</div>)}</div>
          </div>
          <ClaimPreview />
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-[1440px]"><h2 className="cf-display text-center text-4xl font-semibold tracking-[-0.03em] text-[#123f3b] sm:text-5xl">One connected claim journey</h2><p className="mx-auto mt-4 max-w-2xl text-center text-[#61736f]">ClaimFlow keeps reviewers oriented from the first document to the final human decision.</p>
          <div className="mt-12 grid gap-4 md:grid-cols-5">{journey.map((item, index) => <article key={item.title} className="relative rounded-2xl border border-[#d7e1de] bg-white p-5 shadow-[0_8px_24px_rgba(24,61,57,0.035)]"><span className="grid h-14 w-14 place-items-center rounded-full bg-[#e8f6f2] text-[#0b655e]"><LineIcon name={item.icon} className="h-7 w-7" /></span><div className="mt-5 flex items-start gap-2"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[#2a998e] text-xs font-semibold text-[#14776e]">{index + 1}</span><h3 className="cf-display text-lg text-[#173f3b]">{item.title}</h3></div><p className="mt-4 text-sm leading-6 text-[#61736f]">{item.body}</p>{index < journey.length - 1 ? <span className="absolute -right-5 top-1/2 z-10 hidden -translate-y-1/2 text-[#2d6862] md:block"><LineIcon name="arrow-right" className="h-5 w-5" /></span> : null}</article>)}</div>
        </div>
      </section>

      <section id="safety" className="scroll-mt-24 bg-[linear-gradient(180deg,#eff8f5_0%,#f7fbf9_100%)] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-[1440px]"><h2 className="cf-display text-center text-4xl font-semibold tracking-[-0.03em] text-[#123f3b] sm:text-5xl">AI that helps without taking over</h2><div className="mt-12 grid gap-6 md:grid-cols-3">{safeguards.map((item) => <article key={item.title} className="flex gap-5 rounded-2xl border border-[#cfe0db] bg-white p-6"><span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#e6f4f0] text-[#0a645d]"><LineIcon name={item.icon} className="h-8 w-8" /></span><div><h3 className="cf-display text-xl text-[#163f3b]">{item.title}</h3><p className="mt-2 text-sm leading-6 text-[#61736f]">{item.body}</p></div></article>)}</div>
          <div className="relative mt-14 overflow-hidden rounded-[26px] bg-[linear-gradient(105deg,#07544f_0%,#08776d_100%)] px-7 py-10 text-white shadow-[0_18px_45px_rgba(7,84,79,0.17)] sm:px-10 lg:px-14"><div className="relative z-10 max-w-xl"><h2 className="cf-display text-4xl font-medium tracking-[-0.03em]">See the complete claim journey.</h2><p className="mt-3 leading-7 text-[#d3ebe6]">Open ClaimFlow and follow a claim from intake to final decision.</p><Link href={user ? "/dashboard" : "/sign-up"} className="mt-7 inline-flex h-12 items-center justify-center rounded-xl bg-white px-7 font-semibold text-[#0a625b] shadow-lg hover:bg-[#f0faf7]">{user ? "Explore claims" : "Create your workspace"}</Link></div><ClaimFlowMark inverse className="absolute -bottom-16 right-10 h-64 w-64 opacity-[0.07]" /></div>
        </div>
      </section>

      <footer className="border-t border-[#dfe6e3] bg-[#fffefb]"><div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-5 py-9 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12"><ClaimFlowBrand compact /><nav className="flex flex-wrap gap-x-7 gap-y-3 text-sm text-[#41605b]"><a href="#product">Product</a><a href="#how-it-works">How it works</a><a href="#safety">Safety</a><Link href="/evals">Operations</Link></nav><p className="text-xs text-[#74837f]">Human-reviewed motor claims workflow.</p></div></footer>
    </main>
  );
}

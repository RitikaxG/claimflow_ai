import Link from "next/link";
import type { ReactNode } from "react";
import { ClaimFlowBrand } from "../brand/claimflow-brand";
import { LineIcon, type LineIconName } from "../ui/line-icon";

const signInBenefits: Array<[LineIconName, string]> = [
  ["shield", "Protected claim workspace"],
  ["file-check", "Traceable decisions"],
  ["sparkle", "Guarded AI assistance"],
];

const signUpSteps = [
  ["1", "Create your account", "Set up your account in minutes."],
  ["2", "Open your claim workspace", "Organize claims, facts and evidence."],
  ["3", "Keep human decisions in control", "Review, decide and maintain oversight."],
];

function BotanicalBranch() {
  return (
    <svg aria-hidden="true" viewBox="0 0 420 250" className="absolute bottom-0 right-0 w-[72%] max-w-[430px] text-[#91cfc1] opacity-25">
      <path d="M18 245C112 176 215 125 400 54" fill="none" stroke="currentColor" strokeWidth="2.5" />
      {[[92,194,-48],[132,169,36],[174,149,-46],[216,128,36],[258,109,-45],[301,92,38],[342,76,-42],[375,63,40]].map(([x,y,r]) => <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="10" ry="27" fill="currentColor" transform={`rotate(${r} ${x} ${y})`} />)}
    </svg>
  );
}

export function AuthShell({ mode, children }: { mode: "sign-in" | "sign-up"; children: ReactNode }) {
  const isSignIn = mode === "sign-in";
  return (
    <main className="min-h-screen bg-[#fcfbf7] text-[#173c39] lg:grid lg:grid-cols-[42%_58%]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[radial-gradient(circle_at_35%_20%,#0b6a62_0%,#064c48_46%,#033b39_100%)] px-10 py-10 text-white lg:flex lg:flex-col xl:px-16 xl:py-12">
        <ClaimFlowBrand inverse />
        <div className="relative z-10 my-auto max-w-[540px] py-12">
          <h1 className="cf-display text-5xl font-semibold leading-[1.12] tracking-[-0.035em] xl:text-[3.6rem]">
            {isSignIn ? "Every claim stays under human control." : "Start with a clear, reviewable claim journey."}
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-[#d2ebe5]">
            {isSignIn ? "Sign in to review claims, verify evidence and record the final decision." : "Create your workspace to organize claims, guide safe next steps and keep every decision traceable."}
          </p>
          {isSignIn ? (
            <div className="mt-10 space-y-6">
              {signInBenefits.map(([icon, label]) => <div key={label} className="flex items-center gap-4 text-lg"><span className="grid h-11 w-11 place-items-center rounded-full border border-[#8dd7c9]/50 text-[#a7e5d9]"><LineIcon name={icon} className="h-6 w-6" /></span><span>{label}</span></div>)}
            </div>
          ) : (
            <ol className="mt-10 space-y-1">
              {signUpSteps.map(([number, title, body], index) => <li key={title} className="relative flex gap-5 pb-8"><span className="relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-[#84d7c7] bg-[#07524d] cf-display text-xl">{number}</span>{index < signUpSteps.length - 1 ? <span className="absolute left-[21px] top-11 h-9 w-px bg-[#74bcb0]" /> : null}<span className="pt-1"><strong className="cf-display block text-xl font-medium">{title}</strong><span className="mt-1 block text-sm text-[#c2dfd9]">{body}</span></span></li>)}
            </ol>
          )}
        </div>
        <BotanicalBranch />
      </section>

      <section className="flex min-h-screen flex-col px-5 py-5 sm:px-8 lg:px-12 lg:py-8 xl:px-20">
        <div className="flex items-center justify-between gap-4 lg:justify-end">
          <div className="lg:hidden"><ClaimFlowBrand compact /></div>
          <p className="text-sm text-[#405d59]">
            {isSignIn ? "New to ClaimFlow?" : "Already have an account?"}{" "}
            <Link className="font-semibold text-[#0b6d65] underline-offset-4 hover:underline" href={isSignIn ? "/sign-up" : "/sign-in"}>{isSignIn ? "Create account" : "Sign in"}</Link>
          </p>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[610px] rounded-[24px] border border-[#d1ded9] bg-white/80 p-6 shadow-[0_18px_55px_rgba(26,66,61,0.08)] backdrop-blur sm:p-10 lg:p-11">
            <h2 className="cf-display text-4xl font-semibold tracking-[-0.03em] text-[#123f3b] sm:text-[2.7rem]">{isSignIn ? "Welcome back" : "Create your account"}</h2>
            <p className="mb-8 mt-2 text-[#5e716d]">{isSignIn ? "Sign in to continue reviewing claims." : "Set up your ClaimFlow workspace."}</p>
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}

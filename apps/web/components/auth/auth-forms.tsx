"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LineIcon } from "../ui/line-icon";

function safeNextPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

async function parseResponse(response: Response) {
  return (await response.json().catch(() => ({}))) as { error?: string };
}

function PasswordField({ id, label, value, onChange, placeholder, hint, autoComplete }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  hint?: string;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block text-sm font-medium text-[#183f3b]" htmlFor={id}>
      {label}
      <span className="relative mt-2 block">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minLength={8}
          maxLength={128}
          required
          className="h-12 w-full rounded-xl border border-[#cbdad6] bg-white px-4 pr-12 text-base text-[#173c39] outline-none transition placeholder:text-[#82918e] focus:border-[#0d8076] focus:ring-4 focus:ring-[#0d8076]/10"
        />
        <button type="button" onClick={() => setVisible((current) => !current)} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-[#42645f] hover:text-[#0b665e]" aria-label={visible ? "Hide password" : "Show password"}>
          <LineIcon name={visible ? "eye-off" : "eye"} className="h-5 w-5" />
        </button>
      </span>
      {hint ? <span className="mt-1.5 block text-xs font-normal text-[#6d7d79]">{hint}</span> : null}
    </label>
  );
}

function DemoButton({ nextPath, disabled }: { nextPath: string; disabled: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const useDemo = async () => {
    setLoading(true);
    const response = await fetch("/api/auth/demo", { method: "POST" });
    if (response.ok) {
      router.push(safeNextPath(nextPath));
      router.refresh();
    } else {
      setLoading(false);
    }
  };
  return (
    <button type="button" onClick={useDemo} disabled={disabled || loading} className="h-12 w-full rounded-xl border border-[#0b766d] bg-white font-semibold text-[#0b665e] transition hover:bg-[#eff9f6] disabled:cursor-not-allowed disabled:opacity-60">
      {loading ? "Opening demo…" : "Use demo workspace"}
    </button>
  );
}

export function SignInForm({ nextPath = "/dashboard" }: { nextPath?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const response = await fetch("/api/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, remember }),
    });
    const body = await parseResponse(response);
    if (!response.ok) {
      setError(body.error ?? "We could not sign you in. Please try again.");
      setLoading(false);
      return;
    }
    router.push(safeNextPath(nextPath));
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <label className="block text-sm font-medium text-[#183f3b]" htmlFor="email">
        Work email
        <input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" required className="mt-2 h-12 w-full rounded-xl border border-[#cbdad6] bg-white px-4 text-base text-[#173c39] outline-none transition placeholder:text-[#82918e] focus:border-[#0d8076] focus:ring-4 focus:ring-[#0d8076]/10" />
      </label>
      <PasswordField id="password" label="Password" value={password} onChange={setPassword} placeholder="Enter your password" autoComplete="current-password" />
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <label className="inline-flex cursor-pointer items-center gap-2.5 text-[#405d59]">
          <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="h-4 w-4 rounded border-[#9bb5b0] accent-[#0b766d]" />
          Keep me signed in
        </label>
        <a href="mailto:support@claimflow.ai?subject=ClaimFlow%20password%20help" className="font-medium text-[#0b6d65] underline-offset-4 hover:underline">Forgot password?</a>
      </div>
      {error ? <p role="alert" className="rounded-xl border border-[#efc9c2] bg-[#fff6f4] px-4 py-3 text-sm text-[#9a3f32]">{error}</p> : null}
      <button type="submit" disabled={loading} className="h-12 w-full rounded-xl bg-[#087b71] font-semibold text-white shadow-[0_10px_24px_rgba(8,123,113,0.18)] transition hover:bg-[#066a62] disabled:cursor-not-allowed disabled:opacity-60">
        {loading ? "Signing in…" : "Sign in"}
      </button>
      <div className="flex items-center gap-4 text-sm text-[#71817e]"><span className="h-px flex-1 bg-[#d8e1de]" /><span>or</span><span className="h-px flex-1 bg-[#d8e1de]" /></div>
      <DemoButton nextPath={nextPath} disabled={loading} />
      <p className="text-center text-xs leading-5 text-[#71817e]">By continuing, you agree to use ClaimFlow only for authorized claim review.</p>
    </form>
  );
}

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!agreed) {
      setError("Confirm that you will use ClaimFlow for authorized claim review.");
      return;
    }
    setLoading(true);
    setError(null);
    const response = await fetch("/api/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const body = await parseResponse(response);
    if (!response.ok) {
      setError(body.error ?? "We could not create your account. Please try again.");
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-medium text-[#183f3b]" htmlFor="name">
        Full name
        <span className="relative mt-2 block"><LineIcon name="person" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#42645f]" /><input id="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" minLength={2} maxLength={80} required className="h-12 w-full rounded-xl border border-[#cbdad6] bg-white pl-12 pr-4 text-base text-[#173c39] outline-none transition placeholder:text-[#82918e] focus:border-[#0d8076] focus:ring-4 focus:ring-[#0d8076]/10" /></span>
      </label>
      <label className="block text-sm font-medium text-[#183f3b]" htmlFor="signup-email">
        Work email
        <input id="signup-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" required className="mt-2 h-12 w-full rounded-xl border border-[#cbdad6] bg-white px-4 text-base text-[#173c39] outline-none transition placeholder:text-[#82918e] focus:border-[#0d8076] focus:ring-4 focus:ring-[#0d8076]/10" />
      </label>
      <PasswordField id="signup-password" label="Password" value={password} onChange={setPassword} placeholder="Create a password" hint="Use at least 8 characters." autoComplete="new-password" />
      <PasswordField id="confirm-password" label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Repeat your password" autoComplete="new-password" />
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-[#405d59]">
        <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} className="mt-1 h-4 w-4 rounded border-[#9bb5b0] accent-[#0b766d]" />
        <span>I agree to use ClaimFlow only for authorized claims-review work.</span>
      </label>
      {error ? <p role="alert" className="rounded-xl border border-[#efc9c2] bg-[#fff6f4] px-4 py-3 text-sm text-[#9a3f32]">{error}</p> : null}
      <button type="submit" disabled={loading} className="h-12 w-full rounded-xl bg-[#087b71] font-semibold text-white shadow-[0_10px_24px_rgba(8,123,113,0.18)] transition hover:bg-[#066a62] disabled:cursor-not-allowed disabled:opacity-60">
        {loading ? "Creating account…" : "Create account"}
      </button>
      <DemoButton nextPath="/dashboard" disabled={loading} />
      <p className="pt-1 text-center text-xs leading-5 text-[#71817e]">ClaimFlow is designed for authorized claims-review teams.</p>
    </form>
  );
}

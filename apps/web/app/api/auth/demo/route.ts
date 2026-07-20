import { NextResponse } from "next/server";
import { setSession } from "../../../../lib/auth/session";

export async function POST() {
  await setSession(
    {
      id: "demo-reviewer",
      name: "Demo Reviewer",
      email: "demo@claimflow.local",
      role: "CLAIMS_REVIEWER",
    },
    false,
  );
  return NextResponse.json({ ok: true });
}

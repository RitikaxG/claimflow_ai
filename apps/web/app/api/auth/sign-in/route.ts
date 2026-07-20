import { prisma } from "@repo/db";
import { NextResponse } from "next/server";
import { verifyPassword } from "../../../../lib/auth/password";
import { setSession } from "../../../../lib/auth/session";
import { normalizeEmail, validEmail } from "../../../../lib/auth/validation";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";
  const remember = body?.remember === true;

  if (!validEmail(email) || !password) {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, role: true, passwordHash: true },
  });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const sessionUser = { id: user.id, name: user.name, email: user.email, role: user.role };
  await setSession(sessionUser, remember);
  return NextResponse.json({ user: sessionUser });
}

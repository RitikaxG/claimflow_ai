import { prisma } from "@repo/db";
import { NextResponse } from "next/server";
import { hashPassword } from "../../../../lib/auth/password";
import { setSession } from "../../../../lib/auth/session";
import { normalizeEmail, validEmail, validName, validPassword } from "../../../../lib/auth/validation";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!validName(name)) {
    return NextResponse.json({ error: "Enter your full name." }, { status: 400 });
  }
  if (!validEmail(email)) {
    return NextResponse.json({ error: "Enter a valid work email." }, { status: 400 });
  }
  if (!validPassword(password)) {
    return NextResponse.json({ error: "Password must contain between 8 and 128 characters." }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) {
    return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
  }

  try {
    const user = await prisma.user.create({
      data: { name, email, passwordHash: hashPassword(password) },
      select: { id: true, name: true, email: true, role: true },
    });
    await setSession(user, true);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : null;
    if (code === "P2002") {
      return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
    }
    throw error;
  }
}

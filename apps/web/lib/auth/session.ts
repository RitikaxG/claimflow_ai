import { cookies } from "next/headers";
import {
  AUTH_COOKIE_NAME,
  REMEMBERED_SESSION_DURATION_SECONDS,
  SESSION_DURATION_SECONDS,
} from "./constants";
import { createSessionToken, verifySessionToken, type SessionUser } from "./token";

export async function setSession(user: SessionUser, remember = false) {
  const maxAge = remember ? REMEMBERED_SESSION_DURATION_SECONDS : SESSION_DURATION_SECONDS;
  const token = await createSessionToken(user, maxAge);
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);
}

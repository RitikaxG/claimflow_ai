import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "./lib/auth/constants";
import { verifySessionToken } from "./lib/auth/token";

const PUBLIC_API_PATHS = new Set([
  "/api/auth/sign-in",
  "/api/auth/sign-up",
  "/api/auth/demo",
  "/api/auth/session",
  "/api/health",
]);

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const user = await verifySessionToken(request.cookies.get(AUTH_COOKIE_NAME)?.value);

  if (pathname === "/sign-in" || pathname === "/sign-up") {
    return user
      ? NextResponse.redirect(new URL("/dashboard", request.url))
      : NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    if (PUBLIC_API_PATHS.has(pathname) || user) return NextResponse.next();
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!user) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/runs/:path*",
    "/review/:path*",
    "/evals/:path*",
    "/api/:path*",
    "/sign-in",
    "/sign-up",
  ],
};

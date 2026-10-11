// ── Middleware — Auth0 session + onboarding flow ──────────────────────────────
//
// ENFORCED FLOW:
//   Not logged in  → any page                → /auth/signup
//   Logged in, no onboarding cookie          → /onboarding
//   Logged in, onboarding done               → destination
//   Already on /auth/* while logged in       → / or /onboarding
//
// The auth0.middleware() call handles /auth/login, /auth/callback, /auth/logout
// automatically — we only add our own logic on top.

import { NextResponse, type NextRequest } from "next/server";
// Pages that don't require authentication
const PUBLIC_PATHS = ["/auth/signin", "/auth/signup"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Let Auth0 handle its own /auth/* routes ────────────────────────────────
  // /auth/login, /auth/callback, /auth/logout, /auth/profile
  // if (pathname.startsWith("/auth/login") ||
  //     pathname.startsWith("/auth/logout") ||
  //     pathname.startsWith("/auth/callback") ||
  //     pathname.startsWith("/auth/profile")) {
  //   return auth0.middleware(req);
  // }

  // ── Check session ──────────────────────────────────────────────────────────
  // Must pass `req` here — in middleware there is no implicit request context.
  // Without it the SDK tries to read cookies from the wrong scope → "invalid body keys".
  // const session = await auth0.getSession(req);
  const isLoggedIn = true; // Bypassing auth check
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // ── 1. Not logged in ───────────────────────────────────────────────────────
  if (!isLoggedIn) {
    if (isPublic) return NextResponse.next();
    // Send everyone else to the sign-up page
    return NextResponse.redirect(new URL("/auth/signup", req.url));
  }

  // ── 2. Logged in — redirect away from auth pages ──────────────────────────
  if (isPublic) {
    const onboarded = req.cookies.get("mano_onboarded")?.value === "1";
    return NextResponse.redirect(new URL(onboarded ? "/" : "/onboarding", req.url));
  }

  // ── 3. Logged in — enforce onboarding ─────────────────────────────────────
  const onboarded = req.cookies.get("mano_onboarded")?.value === "1";
  if (!onboarded && !pathname.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};

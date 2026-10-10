// ── Auth0 client — single shared instance ─────────────────────────────────────
//
// HOW AUTH0 WORKS (plain English):
//   1. User clicks "Sign in" on your page
//   2. You redirect them to /auth/login (handled by this SDK automatically)
//   3. Auth0 shows its hosted login page — your app never sees the password
//      Auth0 supports Google, GitHub, email/password, magic links — all built in
//   4. After login, Auth0 redirects back to /auth/callback
//   5. The SDK sets a session cookie and redirects the user to your app
//   6. Server components call getSession() to read who's logged in
//   7. Client components use the useUser() hook
//
// REQUIRED ENV VARS (add to .env.local locally, Replit Secrets on Replit):
//   AUTH0_DOMAIN        — e.g. dev-abc123.us.auth0.com
//   AUTH0_CLIENT_ID     — from your Auth0 app settings
//   AUTH0_CLIENT_SECRET — from your Auth0 app settings
//   AUTH0_SECRET        — random 32+ char string (openssl rand -base64 32)
//   APP_BASE_URL        — http://localhost:3000 locally

import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const auth0 = new Auth0Client({
  // All config is read from environment variables automatically.
  // You don't need to pass anything here for basic usage —
  // the SDK reads AUTH0_DOMAIN, AUTH0_CLIENT_ID, etc. from process.env.
  //
  // The onCallback hook runs after every successful login.
  // We use it to redirect new users to onboarding.
   
  async onCallback(_err, ctx) {
    const { NextResponse } = await import("next/server");

    if (_err) {
      return NextResponse.redirect(new URL("/auth/signin?error=1", ctx.appBaseUrl ?? "http://localhost:3000"));
    }

    // If the user has never onboarded, send them to /onboarding.
    // We detect this via the mano_onboarded cookie set by the onboarding page.
    const returnTo = ctx.returnTo ?? "/";
    return NextResponse.redirect(new URL(returnTo, ctx.appBaseUrl ?? "http://localhost:3000"));
  },
});

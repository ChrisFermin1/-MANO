// ── Auth0 route handler ───────────────────────────────────────────────────────
// This single file handles ALL auth routes automatically:
//
//   GET  /auth/login    → redirects to Auth0 login page
//   GET  /auth/logout   → clears session + redirects to Auth0 logout
//   GET  /auth/callback → receives token from Auth0, sets cookie, redirects
//   GET  /auth/profile  → returns session as JSON
//
// You never need to touch this file.

import { auth0 } from "@/lib/auth0";

export const GET = auth0.middleware;
export const POST = auth0.middleware;

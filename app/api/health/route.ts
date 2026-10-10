// ── Health check endpoint ─────────────────────────────────────────────────────
// ENDPOINT: GET /api/health
// Used by the frontend to confirm the backend is reachable.
// Returns a simple 200 OK with status info.

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "mano-frontend",
    timestamp: new Date().toISOString(),
  });
}

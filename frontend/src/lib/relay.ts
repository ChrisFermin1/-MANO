// DEMO-ONLY relay (client side). See demo-relay-server.ts. The real backend replaces these calls with
// GET/POST /public/estimates/:token — the shapes match docs/BACKEND_HANDOFF.md §6.
import type { Job } from "@/lib/api";
import type { Business } from "@/lib/business";

export type RelayEntry = { job: Job; biz: Partial<Business>; approved_at: string | null; approved_by: string | null };

export async function publishEstimate(job: Job, biz: Partial<Business> | null) {
  if (!job.public_token) return;
  try {
    await fetch("/api/demo/estimates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // only what the customer page needs
      body: JSON.stringify({
        token: job.public_token,
        job,
        biz: { businessName: biz?.businessName ?? "", phone: biz?.phone ?? "", ownerName: biz?.ownerName ?? "" },
      }),
    });
  } catch {}
}

export async function fetchEstimate(token: string): Promise<RelayEntry | null> {
  try {
    const r = await fetch(`/api/demo/estimates/${encodeURIComponent(token)}`, { cache: "no-store" });
    return r.ok ? ((await r.json()) as RelayEntry) : null;
  } catch {
    return null;
  }
}

export async function approveRemote(token: string, name: string): Promise<RelayEntry | null> {
  try {
    const r = await fetch(`/api/demo/estimates/${encodeURIComponent(token)}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    return r.ok ? ((await r.json()) as RelayEntry) : null;
  } catch {
    return null;
  }
}

let originCache: Promise<string> | null = null;
/** Base URL for share links: on "localhost", swap in this Mac's Wi-Fi address so a phone can open it. */
export function shareOrigin(): Promise<string> {
  if (typeof window === "undefined") return Promise.resolve("");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
  if (!local) return Promise.resolve(window.location.origin);
  originCache ??= fetch("/api/demo/origin")
    .then((r) => r.json())
    .then((d: { origin: string | null }) => d.origin ?? window.location.origin)
    .catch(() => window.location.origin);
  return originCache;
}

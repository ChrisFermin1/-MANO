// DEMO-ONLY relay (server side). Lets a phone on the same Wi-Fi open & approve an estimate that lives in
// Carlos's laptop browser, until the real FastAPI backend replaces it (GET/POST /public/estimates/:token).
// Stored in a temp JSON file so it survives dev-server reloads. No auth — local network demos only.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type RelayEntry = {
  job: Record<string, unknown> & { estimate_sent_at?: string | null };
  biz: Record<string, unknown>;
  approved_at: string | null;
  approved_by: string | null;
};

const FILE = path.join(os.tmpdir(), "mano-demo-estimates.json");

function readAll(): Record<string, RelayEntry> {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, RelayEntry>) {
  fs.writeFileSync(FILE, JSON.stringify(all));
}

export function getEntry(token: string): RelayEntry | null {
  return readAll()[token] ?? null;
}

/** Carlos's app publishes (or re-publishes) a sent estimate. A NEW send (different sent date) clears an old approval. */
export function upsert(token: string, job: RelayEntry["job"], biz: RelayEntry["biz"]): RelayEntry {
  const all = readAll();
  const prev = all[token];
  const sameSend = prev && prev.job.estimate_sent_at === job.estimate_sent_at;
  all[token] = {
    job,
    biz,
    approved_at: sameSend ? prev.approved_at : null,
    approved_by: sameSend ? prev.approved_by : null,
  };
  writeAll(all);
  return all[token];
}

export function approve(token: string, name: string): RelayEntry | null {
  const all = readAll();
  const e = all[token];
  if (!e) return null;
  if (!e.approved_at) {
    e.approved_at = new Date().toISOString();
    e.approved_by = name.trim();
    writeAll(all);
  }
  return e;
}

/** This Mac's address on the Wi-Fi, so QR codes work from a phone (not "localhost"). */
export function lanOrigin(port: string): string | null {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list ?? []) {
      if (a.family === "IPv4" && !a.internal) return `http://${a.address}:${port}`;
    }
  }
  return null;
}

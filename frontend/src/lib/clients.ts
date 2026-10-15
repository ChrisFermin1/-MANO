// Clients: grouped from Carlos's jobs, plus clients he saved on their own (before any job).
// Saved clients live on this phone until the backend can create a customer without a job
// (Josh's `customers` table: needs a create route and an email field).

import { jobTotal, type Job } from "@/lib/api";

export type SavedClient = { id: string; name: string; phone: string | null; email: string | null; address: string | null; created_at: string };
export type Client = { key: string; savedId: string | null; name: string; phone: string | null; email: string | null; address: string | null; jobs: Job[]; billed: number; since: string };
// The client a new job starts with ("Nuevo trabajo para Maria")
export type ClientPick = Pick<Client, "name" | "phone" | "address">;

const KEY = "mano.clients";
const keyOf = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

export function loadSavedClients(): SavedClient[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as SavedClient[];
  } catch {
    return [];
  }
}

export function saveClient(input: Omit<SavedClient, "id" | "created_at">): SavedClient {
  const client: SavedClient = { ...input, id: Math.random().toString(36).slice(2, 9), created_at: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify([...loadSavedClients(), client]));
  } catch {}
  return client;
}

// One card per client (a client with several jobs, or saved and then given a job, shows once), newest first
export function groupClients(jobs: Job[], saved: SavedClient[]): Client[] {
  const byKey = new Map<string, Client>();
  for (const s of saved) {
    const key = keyOf(s.name);
    if (!key) continue;
    byKey.set(key, { key, savedId: s.id, name: s.name.trim(), phone: s.phone, email: s.email, address: s.address, jobs: [], billed: 0, since: s.created_at });
  }
  for (const job of jobs) {
    const name = job.customer_name?.trim();
    if (!name) continue;
    const key = keyOf(name);
    const c = byKey.get(key) ?? { key, savedId: null, name, phone: null, email: null, address: null, jobs: [], billed: 0, since: job.updated_at };
    c.jobs.push(job);
    c.phone ||= job.customer_phone?.trim() || null;
    c.address ||= job.address?.trim() || null;
    if (job.status !== "CANCELLED") c.billed += jobTotal(job);
    if (job.updated_at > c.since) c.since = job.updated_at;
    byKey.set(key, c);
  }
  return [...byKey.values()].sort((a, b) => b.since.localeCompare(a.since));
}

/** Link to New job for this client: only an id goes in the URL (a saved client's id, or one of their jobs). */
export const newJobHref = (c: Client) =>
  `/trabajos/nuevo?${c.savedId ? `client=${encodeURIComponent(c.savedId)}` : `job=${c.jobs[0]?.id ?? ""}`}`;

/** The client New job was opened for, from the link's id. */
export function clientFromLink(params: URLSearchParams, jobs: Job[]): ClientPick | null {
  const saved = params.get("client") && loadSavedClients().find((c) => c.id === params.get("client"));
  if (saved) return { name: saved.name, phone: saved.phone, address: saved.address };
  const job = params.get("job") && jobs.find((j) => String(j.id) === params.get("job"));
  if (job && job.customer_name) return { name: job.customer_name, phone: job.customer_phone ?? null, address: job.address };
  return null;
}

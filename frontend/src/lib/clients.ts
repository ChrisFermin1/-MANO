// Clients: grouped from Carlos's jobs, plus clients he saved on their own (before any job).
// Saved clients live on this phone until the backend can create a customer without a job
// (Josh's `customers` table: needs a create route and an email field).

import { jobTotal, patchJobs, type Job } from "@/lib/api";

// A private note on a client (Solo): "Prefiere WhatsApp", "Código del portón 4821"
export type ClientNote = { id: string; text: string; created_at: string };
export type SavedClient = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
  notes?: ClientNote[];
};
export type Client = { key: string; savedId: string | null; name: string; phone: string | null; email: string | null; address: string | null; jobs: Job[]; billed: number; since: string };
// The client a new job starts with ("Nuevo trabajo para Maria")
export type ClientPick = Pick<Client, "name" | "phone" | "email" | "address">;

const KEY = "mano.clients";
const keyOf = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

export function loadSavedClients(): SavedClient[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as SavedClient[];
  } catch {
    return [];
  }
}

function writeSaved(all: SavedClient[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
}

export function saveClient(input: Omit<SavedClient, "id" | "created_at">): SavedClient {
  const client: SavedClient = { ...input, id: Math.random().toString(36).slice(2, 9), created_at: new Date().toISOString() };
  writeSaved([...loadSavedClients(), client]);
  return client;
}

// One card per client (a client with several jobs, or saved and then given a job, shows once), newest first.
// A job belongs to a saved client by its id (survives a name fix) or, until it's linked, by the same name.
export function groupClients(jobs: Job[], saved: SavedClient[]): Client[] {
  const byKey = new Map<string, Client>();
  const byId = new Map<string, Client>();
  for (const s of saved) {
    const key = keyOf(s.name);
    if (!key) continue;
    const c: Client = { key, savedId: s.id, name: s.name.trim(), phone: s.phone, email: s.email, address: s.address, jobs: [], billed: 0, since: s.created_at };
    byKey.set(key, c);
    byId.set(s.id, c);
  }
  for (const job of jobs) {
    const name = job.customer_name?.trim();
    const linked = job.client_id ? byId.get(job.client_id) : undefined;
    if (!name && !linked) continue;
    const key = linked?.key ?? keyOf(name!);
    const c = linked ?? byKey.get(key) ?? { key, savedId: null, name: name!, phone: null, email: null, address: null, jobs: [], billed: 0, since: job.updated_at };
    c.jobs.push(job);
    c.phone ||= job.customer_phone?.trim() || null;
    c.address ||= job.address?.trim() || null;
    c.email ||= job.customer_email?.trim() || null;
    if (job.status !== "CANCELLED") c.billed += jobTotal(job);
    if (job.updated_at > c.since) c.since = job.updated_at;
    byKey.set(key, c);
  }
  return [...new Set(byKey.values())].sort((a, b) => b.since.localeCompare(a.since));
}

/** The client page: a saved client's id, or "n:<name>" for one that only exists through its jobs (yet). */
export const clientHref = (c: Client) => `/clientes/${encodeURIComponent(c.savedId ?? `n:${c.key}`)}`;
/** From a job to its client's page. */
export const clientHrefForJob = (job: Job) =>
  job.client_id ? `/clientes/${encodeURIComponent(job.client_id)}` : `/clientes/${encodeURIComponent(`n:${keyOf(job.customer_name ?? "")}`)}`;
export const findClient = (clients: Client[], ref: string) =>
  ref.startsWith("n:") ? clients.find((c) => c.key === ref.slice(2)) : clients.find((c) => c.savedId === ref);

/** Opening a client's page makes them a real client: an id, and their jobs pointing at it. */
export function ensureSavedClient(c: Client): SavedClient {
  const all = loadSavedClients();
  let saved = c.savedId ? all.find((s) => s.id === c.savedId) : undefined;
  if (!saved) saved = saveClient({ name: c.name, phone: c.phone, email: c.email, address: c.address });
  const unlinked = c.jobs.filter((j) => j.client_id !== saved!.id);
  patchJobs(unlinked.map((j) => ({ id: j.id, patch: { client_id: saved!.id } })), { keepDates: true });
  return saved;
}

function updateSaved(id: string, change: (s: SavedClient) => SavedClient): SavedClient | null {
  const all = loadSavedClients();
  const i = all.findIndex((s) => s.id === id);
  if (i < 0) return null;
  all[i] = change(all[i]);
  writeSaved(all);
  return all[i];
}

/** Fix a client's contact info. Their jobs not sent yet get it too; sent documents stay as the client got them.
 *  The address is the client's own (billing) one: a job's address is where the work is, so it's left alone. */
export function updateClientContact(c: Client, form: Pick<SavedClient, "name" | "phone" | "email" | "address">) {
  const saved = ensureSavedClient(c);
  updateSaved(saved.id, (s) => ({ ...s, ...form }));
  const unsent = c.jobs.filter((j) => !j.estimate_sent_at && !j.invoice_sent_at && j.status !== "CANCELLED");
  patchJobs(
    unsent.map((j) => ({
      id: j.id,
      patch: { client_id: saved.id, customer_name: form.name, customer_phone: form.phone, customer_email: form.email },
    })),
  );
}

export const clientNotes = (id: string) => loadSavedClients().find((s) => s.id === id)?.notes ?? [];
export function addClientNote(id: string, text: string) {
  const note: ClientNote = { id: Math.random().toString(36).slice(2, 9), text: text.trim(), created_at: new Date().toISOString() };
  updateSaved(id, (s) => ({ ...s, notes: [note, ...(s.notes ?? [])] }));
}
export function removeClientNote(id: string, noteId: string) {
  updateSaved(id, (s) => ({ ...s, notes: (s.notes ?? []).filter((n) => n.id !== noteId) }));
}

/** Link to New job for this client: only an id goes in the URL (a saved client's id, or one of their jobs). */
export const newJobHref = (c: Client) =>
  `/trabajos/nuevo?${c.savedId ? `client=${encodeURIComponent(c.savedId)}` : `job=${c.jobs[0]?.id ?? ""}`}`;

/** The client New job was opened for, from the link's id. */
export function clientFromLink(params: URLSearchParams, jobs: Job[]): ClientPick | null {
  const saved = params.get("client") && loadSavedClients().find((c) => c.id === params.get("client"));
  if (saved) return { name: saved.name, phone: saved.phone, email: saved.email, address: saved.address };
  const job = params.get("job") && jobs.find((j) => String(j.id) === params.get("job"));
  if (job && job.customer_name) return { name: job.customer_name, phone: job.customer_phone ?? null, email: job.customer_email ?? null, address: job.address };
  return null;
}

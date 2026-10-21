// Moving what's on this phone to the account on the server, the first time a real account signs in.
// FAKE for now (there's no server-side data yet): importToServer only walks the steps and remembers it's done.
// Phase 0 (docs/MANO_IMPLEMENTATION_ROADMAP.md, item 0.10) replaces its inside with POST /import; keep the names.
//
// Off until the server holds the data: set NEXT_PUBLIC_SERVER_DATA=1 to have Mano ask after signing in.
// The screen can be previewed any time at /importar.

import { getJobs } from "@/lib/api";
import { countAllFiles } from "@/lib/attachments";
import { loadBusiness } from "@/lib/business";
import { groupClients, loadSavedClients } from "@/lib/clients";

export const SERVER_DATA = process.env.NEXT_PUBLIC_SERVER_DATA === "1";
const DONE = "mano.imported"; // when this phone's data went up (ISO date)

export type Snapshot = { business: boolean; jobs: number; clients: number; invoices: number; payments: number; files: number };
export type ImportStep = "business" | "clients" | "jobs" | "files";

/** What this phone has that the account doesn't (yet). */
export async function localSnapshot(): Promise<Snapshot> {
  const jobs = await getJobs();
  return {
    business: !!loadBusiness()?.businessName,
    jobs: jobs.length,
    clients: groupClients(jobs, loadSavedClients()).length,
    invoices: jobs.filter((j) => j.invoice_number).length,
    payments: jobs.reduce((n, j) => n + (j.payments?.length ?? 0), 0),
    files: await countAllFiles(),
  };
}

export const importedAt = () => {
  try {
    return localStorage.getItem(DONE);
  } catch {
    return null;
  }
};

/** Ask after signing in: only when the server holds data, there's something here, and it wasn't uploaded yet. */
export async function needsImport(): Promise<boolean> {
  if (!SERVER_DATA || importedAt()) return false;
  const s = await localSnapshot();
  return s.jobs + s.clients + s.files > 0 || s.business;
}

/** Uploads business → clients → jobs (with estimates, invoices, payments) → photos. Real version: the server does
 *  it in one transaction per step and is safe to retry (same ids → no duplicates). */
export async function importToServer(onStep: (step: ImportStep) => void): Promise<Snapshot> {
  onStep("business"); // show progress right away; reading this phone's data takes a moment
  const snapshot = await localSnapshot();
  for (const step of ["business", "clients", "jobs", "files"] as ImportStep[]) {
    onStep(step);
    await new Promise((r) => setTimeout(r, 700));
  }
  localStorage.setItem(DONE, new Date().toISOString());
  return snapshot;
}

/** "Ahora no": ask again next time Mano opens. */
export const skipImportForNow = () => sessionStorage.setItem(`${DONE}.skip`, "1");
export const skippedThisVisit = () => {
  try {
    return sessionStorage.getItem(`${DONE}.skip`) === "1";
  } catch {
    return false;
  }
};

// Plans. FAKE for now: "upgrading" just flips a setting on this phone, nothing is charged.
// When the team picks the payment service (Stripe on the web; Apple / Google in-app purchases if Mano goes
// in the stores), ONLY this file changes: keep the same names and the screens keep working.
// Prices are the Vision doc's first guesses (Free / Solo ~$15–25 / Crew ~$40–60), to test with real contractors.

export type PlanId = "free" | "solo" | "crew";

export type PlanInfo = {
  id: PlanId;
  price: number; // USD a month
  photosPerJob: number; // photos on one job (Infinity = no limit)
  files: boolean; // PDFs (drawings, contracts, receipts) besides photos
};

export const PLANS: Record<PlanId, PlanInfo> = {
  free: { id: "free", price: 0, photosPerJob: 3, files: false },
  solo: { id: "solo", price: 19, photosPerJob: Infinity, files: true },
  crew: { id: "crew", price: 49, photosPerJob: Infinity, files: true },
};

const KEY = "mano.plan";
const listeners = new Set<() => void>();

export function getPlan(): PlanInfo {
  try {
    const id = localStorage.getItem(KEY) as PlanId | null;
    return PLANS[id && id in PLANS ? id : "free"];
  } catch {
    return PLANS.free;
  }
}

/** Re-run when the plan changes (also from another tab). */
export function onPlanChange(fn: () => void): () => void {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => e.key === KEY && fn();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

/** Real version: opens checkout and resolves when the payment went through. */
export async function choosePlan(id: PlanId): Promise<PlanInfo> {
  await new Promise((r) => setTimeout(r, 900));
  localStorage.setItem(KEY, id);
  listeners.forEach((fn) => fn());
  return PLANS[id];
}

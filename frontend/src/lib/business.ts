import type { TradeId } from "@/lib/i18n";

export type PriceUnit = "hour" | "project" | "sqft" | "room";

// When Carlos picks "Otro", he names the work himself (e.g. "Techos") and how he charges for it
export type OtherTrade = { name: string; unit: PriceUnit };

// Single-business MVP: no accounts. Stored locally until the backend has POST /business.
export type Business = {
  ownerName: string;
  businessName: string;
  phone: string;
  trades: TradeId[];
  otherTrade?: OtherTrade | null;
  // Ojo checklist items Carlos said he always includes in his price ("Ya lo incluyo siempre")
  ojoIgnore?: string[];
  // Client names Carlos corrected once ("atl homeiker" → "ATL Homemaker"), fixed automatically on new jobs
  nameFixes?: Record<string, string>;
};

const KEY = "mano.business";

export const DEMO_BUSINESS: Business = {
  ownerName: "Carlos",
  businessName: "Carlos Painting & Drywall",
  phone: "",
  trades: ["painting", "drywall"],
  ojoIgnore: [],
};

export function loadBusiness(): Business | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Business) : null;
  } catch {
    return null;
  }
}

const nameKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

export function rememberNameFix(heard: string | null | undefined, fixed: string | null | undefined) {
  if (!heard?.trim() || !fixed?.trim() || nameKey(heard) === nameKey(fixed)) return;
  saveBusiness({ nameFixes: { ...(loadBusiness()?.nameFixes ?? {}), [nameKey(heard)]: fixed.trim() } });
}

export const knownNameFix = (name: string | null | undefined) => (name ? loadBusiness()?.nameFixes?.[nameKey(name)] ?? null : null);

export function saveBusiness(patch: Partial<Business>) {
  try {
    const current = loadBusiness() ?? { ...DEMO_BUSINESS, ownerName: "", businessName: "", trades: [] };
    localStorage.setItem(KEY, JSON.stringify({ ...current, ...patch }));
  } catch {}
}

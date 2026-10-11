import type { TradeId } from "@/lib/i18n";
import { apiRequest } from "@/lib/http";

export const DEMO_BUSINESS_ID = "00000000-0000-4000-8000-00000000ca71";

export type PriceUnit = "hour" | "project" | "sqft" | "room";

// When Carlos picks "Otro", he names the work himself (e.g. "Techos") and how he charges for it
export type OtherTrade = { name: string; unit: PriceUnit };

// Shared presentation shape. Live profiles come from FastAPI; legacy demo preferences stay local.
export type Business = {
  business_id?: string;
  business_type?: string | null;
  business_address?: string | null;
  ownerName: string;
  businessName: string;
  phone: string;
  trades: TradeId[];
  otherTrade?: OtherTrade | null;
  // Ojo checklist items Carlos said he always includes in his price ("Ya lo incluyo siempre")
  ojoIgnore?: string[];
};

const KEY = "mano.business";

export const DEMO_BUSINESS: Business = {
  ownerName: "Carlos",
  businessName: "Carlos Painting & Drywall",
  phone: "",
  trades: ["painting", "drywall"],
  ojoIgnore: [],
};

/** Authoritative demo profile; local onboarding preferences cannot override it. */
export async function fetchBusiness(): Promise<Business> {
  const data = await apiRequest<{
    business_id: string; owner_name: string | null; business_name: string | null;
    business_type: string | null; business_address: string | null; phone_number: string | null;
  }>(`/business/${DEMO_BUSINESS_ID}`);
  return {
    business_id: data.business_id,
    ownerName: data.owner_name ?? "",
    businessName: data.business_name ?? "",
    phone: data.phone_number ?? "",
    business_type: data.business_type,
    business_address: data.business_address,
    trades: [],
  };
}

export function loadBusiness(): Business | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Business) : null;
  } catch {
    return null;
  }
}

export function saveBusiness(patch: Partial<Business>) {
  try {
    const current = loadBusiness() ?? { ...DEMO_BUSINESS, ownerName: "", businessName: "", trades: [] };
    localStorage.setItem(KEY, JSON.stringify({ ...current, ...patch }));
  } catch {}
}

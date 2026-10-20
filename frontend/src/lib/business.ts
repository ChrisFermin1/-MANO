import type { TradeId } from "@/lib/i18n";

export type PriceUnit = "hour" | "project" | "sqft" | "room";

// When Carlos picks "Otro", he names the work himself (e.g. "Techos") and how he charges for it
export type OtherTrade = { name: string; unit: PriceUnit };

// Single-business MVP: no accounts. Stored locally until the backend has POST /business.
export type Business = {
  ownerName: string; // first and last name ("Carlos Méndez"); friendly messages use the first word
  email?: string; // printed on estimates and invoices
  address?: string; // printed on invoices: where clients mail checks
  businessName: string;
  phone: string;
  // How clients pay (e.g. "Zelle: (713) 555-0100"), printed on invoices and the customer's link
  payInfo?: string;
  // Invoices are due this many days after sending (0 = on receipt). Default 15.
  invoiceDueDays?: number;
  // Where his invoice numbers continue from (coming from Wave at #189 → 190). Mano never goes below the
  // highest number it already used, so this can't create a duplicate.
  nextInvoiceNumber?: number;
  trades: TradeId[];
  otherTrade?: OtherTrade | null;
  // Ojo's "¿se te olvidó cobrar…?" questions. Off unless he turns them on in Tu negocio: contractors
  // who price their own jobs rarely forget, and the questions were friction (Abe, testing with Edgar).
  ojoQuestions?: boolean;
  // Ojo checklist items Carlos said he always includes in his price ("Ya lo incluyo siempre")
  ojoIgnore?: string[];
  // Labels for silenced questions that came from Gemini (built-in questions have their own labels)
  ojoIgnoreLabels?: Record<string, { es: string; en: string }>;
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

/** "Carlos Méndez" → "Carlos", for friendly messages ("this is Carlos from…"). */
export const firstNameOf = (full: string | null | undefined) => (full ?? "").trim().split(/\s+/)[0] ?? "";

// Same choices as Wave (what contractors switching from it already use); any other date is set per invoice
export const DUE_OPTIONS = [0, 15, 30, 45, 60, 90] as const;

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

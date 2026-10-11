// MANO — turns Carlos's words into a structured job, and writes messages.
// interpret(): Gemini via /api/extract. If the key is missing or Gemini fails, the built-in
// extractor below takes over, so creating a job never stops (and the demo never breaks).

import type { Job, LineItem, OjoAiQuestion } from "@/lib/api";
import type { OtherTrade } from "@/lib/business";
import { toEnglish } from "@/lib/translate";

type Interpreted = Pick<
  Job,
  "customer_name" | "customer_name_suggested" | "customer_phone" | "address" | "service" | "service_es" | "job_total" | "price_note" | "price_note_es" | "line_items"
>;

// Thrown only when Mano is busy (rate limit) — worth telling Carlos to wait a moment
export class ManoBusyError extends Error {}

type GeminiReply = { status: number; data: unknown };

async function askGemini(description: string, otherTrade?: OtherTrade | null): Promise<GeminiReply> {
  try {
    const response = await fetch("/api/extract", {
      // the server already races a 2nd request and stops at 20s; this is just a safety net
      signal: AbortSignal.timeout(25_000),
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, otherTrade: otherTrade?.name ?? null }),
    });
    return { status: response.status, data: await response.json().catch(() => null) };
  } catch {
    return { status: 0, data: null }; // offline / server down / timed out
  }
}

// Organize ahead of time: a scanned note's text is sent to Gemini while Carlos is still reading it.
// If he taps "Mano, organízalo" without changing it, the answer is already here (or on its way).
const ahead = new Map<string, Promise<GeminiReply>>();
const aheadKey = (description: string, otherTrade?: OtherTrade | null) => `${otherTrade?.name ?? ""}\n${description.trim()}`;

export function organizeAhead(description: string, otherTrade?: OtherTrade | null) {
  const key = aheadKey(description, otherTrade);
  if (!description.trim() || ahead.has(key)) return;
  ahead.clear(); // only the latest note matters
  ahead.set(key, askGemini(description.trim(), otherTrade));
}

export async function interpret(description: string, otherTrade?: OtherTrade | null): Promise<Interpreted> {
  const key = aheadKey(description, otherTrade);
  const early = ahead.get(key);
  ahead.delete(key);
  // an early answer that failed (offline, busy…) gets one fresh try instead of being reused
  let { status, data } = early ? await early : await askGemini(description, otherTrade);
  if (early && status !== 200) ({ status, data } = await askGemini(description, otherTrade));

  if (status === 429) throw new ManoBusyError();

  const d = data as Partial<Interpreted> | null;
  if (status === 200 && d && typeof d.service === "string" && Array.isArray(d.line_items)) {
    return {
      customer_name: d.customer_name ?? null,
      customer_name_suggested: d.customer_name_suggested ?? null,
      // Gemini's schema has no phone yet; the regex still catches one Carlos said
      customer_phone: description.match(PHONE)?.[0]?.trim() ?? null,
      address: d.address ?? null,
      service: d.service,
      service_es: d.service_es ?? null,
      job_total: d.job_total ?? null,
      price_note: d.price_note ?? null,
      price_note_es: d.price_note_es ?? null,
      line_items: d.line_items.map((i) => ({ ...i, translation_pending: !i.description })),
    };
  }

  if (status !== 503) console.warn("Mano (Gemini) failed, using the built-in extractor", status, data);
  return interpretLocally(description, otherTrade);
}

/* ───────── Built-in extractor (no AI) ───────── */

const uid = () => Math.random().toString(36).slice(2, 9);

// [match, English, Spanish] — Mano writes every line in both languages
const ROOMS: [RegExp, string, string][] = [
  [/\bsala\b|living/i, "living room", "sala"],
  [/cocina|kitchen/i, "kitchen", "cocina"],
  [/baño|bano|bathroom/i, "bathroom", "baño"],
  [/cuarto|rec[aá]mara|habitaci[oó]n|bedroom/i, "bedroom", "cuarto"],
  [/comedor|dining/i, "dining room", "comedor"],
  [/pasillo|hallway/i, "hallway", "pasillo"],
  [/garage|garaje|cochera/i, "garage", "garaje"],
];

const NAME = "[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+";
const CUSTOMER = new RegExp(`(?:para|for|de|cliente|customer)\\s+(${NAME}(?:\\s+${NAME})?)`);
const ADDRESS = /\d+\s+[\w\s.]+?\b(?:st|street|ave|avenue|rd|road|dr|drive|blvd|ln|lane|calle|way)\b\.?(?:,\s*[\w\s]+)?/i;

// US-style phone: 832-555-1234, (832) 555 1234, 8325551234, +1 832 555 1234
const PHONE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Prices: the real Gemini version returns only prices Carlos *said*. Mano never suggests prices.
function interpretLocally(
  text: string,
  otherTrade?: OtherTrade | null,
): Pick<Job, "customer_name" | "customer_phone" | "address" | "service" | "line_items"> {
  const items: LineItem[] = [];
  let service = "";

  // Carlos's own trade from "Otro" (e.g. "Techos y cercas") — match on word stems
  if (otherTrade?.name) {
    const stems = otherTrade.name
      .toLowerCase()
      .split(/[\s,/]+|\by\b|\band\b/)
      .filter((w) => w.length >= 4)
      .map((w) => w.slice(0, 5));
    if (stems.some((s) => text.toLowerCase().includes(s))) {
      // "Techos" could mean roofs or ceilings — the mock won't guess; Gemini translates with context
      items.push({ id: uid(), description: "", description_es: cap(otherTrade.name), translation_pending: true, amount: null });
      service = cap(otherTrade.name);
    }
  }

  if (/pint|paint/i.test(text)) {
    const rooms = ROOMS.filter(([re]) => re.test(text));
    const two = /(2|dos|two)\s*(manos|capas|coats)/i.test(text);
    const en = rooms.length ? cap(rooms.map(([, r]) => r).join(" and ")) : "Interior painting";
    const es = rooms.length ? cap(rooms.map(([, , r]) => r).join(" y ")) : "Pintura interior";
    items.push({ id: uid(), description: `${en}${two ? ", 2 coats" : ""}`, description_es: `${es}${two ? ", 2 manos" : ""}`, amount: null });
    service = "Interior Painting";
  }
  if (/drywall|pared|wall|grieta|crack|hoyo|hole|parch|patch/i.test(text)) {
    const crack = /grieta|crack/i.test(text);
    items.push({
      id: uid(),
      description: crack ? "Wall crack repair" : "Drywall patch",
      description_es: crack ? "Reparar grieta en la pared" : "Parche de drywall",
      amount: null,
    });
    service ||= "Drywall Repair";
  }
  if (/piso|floor/i.test(text)) {
    items.push({ id: uid(), description: "Flooring installation", description_es: "Instalación de piso", amount: null });
    service ||= "Flooring";
  }
  if (/remodel/i.test(text)) {
    items.push({ id: uid(), description: "Remodeling", description_es: "Remodelación", amount: null });
    service ||= "Remodeling";
  }
  if (!items.length && text.trim()) {
    const es = text.trim().slice(0, 60);
    const en = toEnglish(es);
    items.push({ id: uid(), description: en ?? "", description_es: es, translation_pending: en == null, amount: null });
    service = "General Work";
  }

  return {
    customer_name: text.match(CUSTOMER)?.[1] ?? null,
    customer_phone: text.match(PHONE)?.[0]?.trim() ?? null,
    address: text.match(ADDRESS)?.[0]?.trim() ?? null,
    service,
    line_items: items,
  };
}

// "Escanear una nota": shrink the photo on the phone (fast to send, still easy to read), then Gemini
// copies the note word for word. "" = the photo isn't a job note; null = couldn't read it (try again).
export class ManoBusyReadingError extends Error {}

async function shrinkPhoto(file: File): Promise<{ image: string; mimeType: string }> {
  const toBase64 = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (blob) return { image: await toBase64(blob), mimeType: "image/jpeg" };
  } catch {
    // this browser can't open the format (e.g. HEIC on a laptop): send the original
  }
  return { image: await toBase64(file), mimeType: file.type || "image/jpeg" };
}

export async function readNote(file: File): Promise<string | null> {
  try {
    const response = await fetch("/api/read-note", {
      method: "POST",
      signal: AbortSignal.timeout(40_000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await shrinkPhoto(file)),
    });
    if (response.status === 429) throw new ManoBusyReadingError();
    if (!response.ok) return null;
    const data = await response.json();
    return typeof data.text === "string" ? data.text : null;
  } catch (error) {
    if (error instanceof ManoBusyReadingError) throw error;
    return null;
  }
}

// Ojo's questions from Gemini for trades without a built-in checklist. null = couldn't ask (try again later).
export async function ojoQuestions(job: Job, trade: string): Promise<OjoAiQuestion[] | null> {
  try {
    const response = await fetch("/api/ojo-suggest", {
      method: "POST",
      signal: AbortSignal.timeout(30_000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trade,
        service: job.service_es || job.service,
        description: job.description,
        items: job.line_items.map((i) => [i.description_es, i.description].filter(Boolean).join(" / ")),
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return Array.isArray(data.questions) ? (data.questions as OjoAiQuestion[]) : null;
  } catch {
    return null;
  }
}

export async function followUpMessage(job: Job, owner: string, business: string, total: string) {
  const name = (job.customer_name ?? "").split(" ")[0] || "there";
  if (job.status === "PAYMENT_PENDING" || job.status === "COMPLETED") {
    return {
      en: `Hi ${name}, this is ${owner} from ${business}. Thank you again for trusting us with your ${job.service.toLowerCase()}! Just a friendly reminder that the balance of ${total} is due. Let me know if you have any questions.`,
      es: `Hola ${name}, soy ${owner} de ${business}. ¡Gracias otra vez por confiar en nosotros! Solo un recordatorio amable de que el saldo de ${total} está pendiente. Avísame si tienes preguntas.`,
    };
  }
  return {
    en: `Hi ${name}, this is ${owner} from ${business}. I wanted to follow up on the ${total} estimate for your ${job.service.toLowerCase()}. Do you have any questions? I have openings next week and would be happy to get you on the schedule.`,
    es: `Hola ${name}, soy ${owner} de ${business}. Quería darle seguimiento al estimado de ${total}. ¿Tienes alguna pregunta? Tengo espacio la próxima semana y con gusto te agendo.`,
  };
}

// MANO (mock) — turns Carlos's words into a structured job, and writes messages.
// Person 3's LLM endpoint replaces interpret(); keep the same return shape.

import type { Job, LineItem } from "@/lib/api";
import type { OtherTrade } from "@/lib/business";
import { toEnglish } from "@/lib/translate";

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

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Prices: the real Gemini version returns only prices Carlos *said*. Mano never suggests prices.
export function interpret(
  text: string,
  otherTrade?: OtherTrade | null,
): Pick<Job, "customer_name" | "address" | "service" | "line_items"> {
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
    address: text.match(ADDRESS)?.[0]?.trim() ?? null,
    service,
    line_items: items,
  };
}

export function followUpMessage(job: Job, owner: string, business: string, total: string) {
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

// MANO translation (mock). Carlos reads/edits line items in Spanish; the customer's estimate is always English.
// Real version: POST /mano/translate (Gemini). This mock only knows common contractor vocabulary and
// returns null for anything it doesn't know — better "pending" than broken English on a customer's estimate.

const NUMBERS: Record<string, string> = {
  un: "1", una: "1", uno: "1", dos: "2", tres: "3", cuatro: "4", cinco: "5", seis: "6", siete: "7", ocho: "8", nueve: "9", diez: "10",
};

// Spanish word → English word (singular/plural listed separately; accents stripped before lookup)
const ES_EN: Record<string, string> = {
  // places
  sala: "living room", cocina: "kitchen", cocinas: "kitchens", bano: "bathroom", banos: "bathrooms", cuarto: "bedroom", cuartos: "bedrooms",
  recamara: "bedroom", recamaras: "bedrooms", habitacion: "bedroom", comedor: "dining room", pasillo: "hallway", garaje: "garage",
  cochera: "garage", escalera: "stairs", escaleras: "stairs", oficina: "office", lavanderia: "laundry room", closet: "closet",
  exterior: "exterior", interior: "interior", casa: "house", patio: "patio", cerca: "fence", barda: "fence", entrada: "entryway",
  // surfaces & parts
  pared: "wall", paredes: "walls", techo: "ceiling", techos: "ceilings", puerta: "door", puertas: "doors", ventana: "window",
  ventanas: "windows", piso: "floor", pisos: "floors", trim: "trim", zoclo: "baseboard", zoclos: "baseboards", zocalo: "baseboard",
  zocalos: "baseboards", gabinete: "cabinet", gabinetes: "cabinets", marco: "frame", marcos: "frames",
  // work
  pintar: "paint", pintura: "painting", reparar: "repair", reparacion: "repair", arreglar: "fix", parche: "patch", parches: "patches",
  parchar: "patch", resanar: "patch", grieta: "crack", grietas: "cracks", hoyo: "hole", hoyos: "holes", textura: "texture",
  primer: "primer", sellador: "sealer", sellar: "sealing", limpieza: "cleanup", escombro: "debris", demolicion: "demolition",
  instalar: "install", instalacion: "installation", quitar: "remove", nivelar: "level", lijar: "sand", lijado: "sanding",
  mover: "move", proteger: "protect", muebles: "furniture", materiales: "materials", material: "material", mano: "coat",
  manos: "coats", capa: "coat", capas: "coats", segunda: "second", primera: "first", completo: "complete", completa: "complete",
  drywall: "drywall", tablaroca: "drywall", azulejo: "tile", azulejos: "tiles", plomeria: "plumbing", permisos: "permits",
  mezcla: "mud", accesorios: "fixtures", transiciones: "transitions", imprevistos: "contingency", viejo: "old", nuevo: "new",
  despues: "after", sobre: "over", todo: "all", toda: "all", todos: "all", todas: "all",
  // little words
  y: "and", con: "with", sin: "without", para: "for", en: "in", por: "per", al: "to the",
};
// dropped in English ("la sala" → "living room")
const DROP = new Set(["el", "la", "los", "las", "de", "del", "un", "una"]);

const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Spanish → English, or null if the mock can't do it confidently. */
export function toEnglish(es: string): string | null {
  const text = es.trim();
  if (!text) return null;
  const out: string[] = [];
  const words = text.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const raw = words[i];
    const lead = raw.match(/^[^\p{L}\d]*/u)![0];
    const trail = raw.match(/[^\p{L}\d]*$/u)![0];
    const core = raw.slice(lead.length, raw.length - trail.length);
    if (!core) {
      out.push(raw);
      continue;
    }
    const w = strip(core);
    // "dos manos" → "2 coats"; articles are dropped only when they aren't counts ("una mano" → "1 coat")
    const next = words[i + 1] ? strip(words[i + 1]) : "";
    const isCount = !!NUMBERS[w] && /^(mano|manos|capa|capas|puerta|puertas|cuarto|cuartos|parche|parches|hoyo|hoyos|ventana|ventanas)/.test(next);
    if (/^\d+([.,]\d+)?$/.test(w)) out.push(lead + core + trail);
    else if (isCount) out.push(lead + NUMBERS[w] + trail);
    else if (DROP.has(w)) continue;
    else if (ES_EN[w]) out.push(lead + ES_EN[w] + trail);
    else return null; // unknown word → don't guess
  }
  return cap(out.join(" ").replace(/\s+([,.;])/g, "$1").replace(/\s+/g, " ").trim());
}

/**
 * The ONE place the app asks for a translation. Today: the mock above (contractor vocabulary only, so full
 * sentences usually come back null). With the backend: `POST /mano/translate` → Gemini. Screens don't change.
 */
export async function translateToEnglish(text: string): Promise<string | null> {
  return toEnglish(text);
}

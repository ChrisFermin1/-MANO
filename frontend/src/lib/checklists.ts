// Ojo's "did you forget to charge for…?" checklists, one per trade.
// Paso 1 (tipo de trabajo) decides which lists Ojo watches for Carlos.

import type { TradeId } from "@/lib/i18n";

export type ChecklistItem = {
  key: string;
  label: { es: string; en: string }; // short chip on Paso 1
  ask: { es: string; en: string }; // Ojo's question on the job page
  item: string; // customer-facing English line item if Carlos adds it
  item_es: string; // the same line in Carlos's language
  mentioned: RegExp; // already covered by the job → don't ask
};

type Checklist = {
  detect: RegExp; // does this job involve this trade?
  items: ChecklistItem[];
};

const furniture: ChecklistItem = {
  key: "furniture",
  label: { es: "mover muebles", en: "moving furniture" },
  ask: { es: "¿Mover y proteger muebles?", en: "Move and protect furniture?" },
  item: "Furniture moving & protection", item_es: "Mover y proteger muebles",
  mentioned: /furniture|mueble/i,
};

const permits: ChecklistItem = {
  key: "permits",
  label: { es: "permisos", en: "permits" },
  ask: { es: "¿Hay que sacar permisos?", en: "Are permits needed?" },
  item: "Permits", item_es: "Permisos",
  mentioned: /permit|permiso/i,
};

const debris: ChecklistItem = {
  key: "debris",
  label: { es: "limpieza y escombro", en: "cleanup & debris" },
  ask: { es: "¿Limpieza y sacar escombro?", en: "Cleanup and debris removal?" },
  item: "Cleanup & debris removal", item_es: "Limpieza y sacar escombro",
  mentioned: /debris|cleanup|clean-up|escombro|limpieza/i,
};

const demolition: ChecklistItem = {
  key: "demolition",
  label: { es: "demolición", en: "demolition" },
  ask: { es: "¿Incluye demolición?", en: "Include demolition?" },
  item: "Demolition", item_es: "Demolición",
  mentioned: /demo(lition|lición)?\b|tear.?out/i,
};

export const CHECKLISTS: Record<Exclude<TradeId, "other">, Checklist> = {
  painting: {
    detect: /pint|paint|coat|\bmanos?\b/i,
    items: [
      { key: "primer", label: { es: "primer", en: "primer" }, ask: { es: "¿Necesita primer?", en: "Does it need primer?" }, item: "Primer coat", item_es: "Mano de primer", mentioned: /primer|sellador/i },
      { key: "ceilings", label: { es: "techos", en: "ceilings" }, ask: { es: "¿Incluye pintar los techos?", en: "Include painting ceilings?" }, item: "Ceiling painting", item_es: "Pintar techos", mentioned: /ceiling|techo/i },
      { key: "trim", label: { es: "trim", en: "trim" }, ask: { es: "¿Incluir el trim y las puertas?", en: "Include trim and doors?" }, item: "Trim and doors", item_es: "Trim y puertas", mentioned: /trim|door|puerta/i },
      { key: "second_coat", label: { es: "segunda mano", en: "second coat" }, ask: { es: "¿Lleva segunda mano?", en: "Does it need a second coat?" }, item: "Second coat", item_es: "Segunda mano", mentioned: /2 coats|two coats|second coat|dos manos|segunda mano/i },
      { key: "patching", label: { es: "resanar paredes", en: "wall patching" }, ask: { es: "¿Hay que resanar las paredes antes?", en: "Patch walls before painting?" }, item: "Wall patching & prep", item_es: "Resanar y preparar paredes", mentioned: /patch|crack|repair|resan|parche|grieta/i },
      furniture,
      { key: "paint_materials", label: { es: "pintura y materiales", en: "paint & materials" }, ask: { es: "¿Cobraste la pintura y materiales?", en: "Did you charge for paint and materials?" }, item: "Paint & materials", item_es: "Pintura y materiales", mentioned: /material/i },
    ],
  },
  drywall: {
    detect: /drywall|tablaroca|sheetrock|wall|pared|crack|grieta|patch|parch|hoyo|hole/i,
    items: [
      { key: "texture", label: { es: "textura", en: "texture" }, ask: { es: "¿Incluye igualar la textura?", en: "Include texture matching?" }, item: "Texture matching", item_es: "Igualar textura", mentioned: /textur/i },
      { key: "prime_patch", label: { es: "primer sobre parches", en: "primer on patches" }, ask: { es: "¿Primer sobre los parches?", en: "Primer over the patches?" }, item: "Primer over patches", item_es: "Primer sobre parches", mentioned: /primer/i },
      { key: "paint_after", label: { es: "pintar después", en: "paint after repair" }, ask: { es: "¿Pintar después de reparar?", en: "Paint after the repair?" }, item: "Paint after repair", item_es: "Pintar después de reparar", mentioned: /paint|pint/i },
      debris,
    ],
  },
  flooring: {
    detect: /piso|floor|laminate|laminado|vinyl|vinil|tile|azulejo|loseta/i,
    items: [
      { key: "floor_removal", label: { es: "quitar piso viejo", en: "old floor removal" }, ask: { es: "¿Quitar el piso viejo?", en: "Remove the old floor?" }, item: "Old flooring removal", item_es: "Quitar piso viejo", mentioned: /remov|quitar/i },
      { key: "leveling", label: { es: "nivelar", en: "leveling" }, ask: { es: "¿Hay que nivelar el piso?", en: "Does the floor need leveling?" }, item: "Floor leveling", item_es: "Nivelar piso", mentioned: /level|nivel/i },
      { key: "baseboards", label: { es: "zócalos", en: "baseboards" }, ask: { es: "¿Incluye zócalos?", en: "Include baseboards?" }, item: "Baseboards", item_es: "Zócalos", mentioned: /baseboard|z[oó]calo/i },
      { key: "transitions", label: { es: "transiciones", en: "transitions" }, ask: { es: "¿Transiciones entre cuartos?", en: "Transition strips between rooms?" }, item: "Transition strips", item_es: "Transiciones", mentioned: /transition|transici/i },
      furniture,
    ],
  },
  bathKitchen: {
    // specific words only — "pintar la cocina" must NOT trigger a plumbing checklist
    detect: /remodel|cabinet|gabinete|countertop|cubierta|vanity|shower|regadera|tub|tina|sink|lavabo|fregadero|toilet|inodoro|backsplash|azulejo/i,
    items: [
      demolition,
      { key: "plumbing", label: { es: "plomería", en: "plumbing" }, ask: { es: "¿Incluye conexiones de plomería?", en: "Include plumbing connections?" }, item: "Plumbing connections", item_es: "Conexiones de plomería", mentioned: /plumb|plomer/i },
      permits,
      { key: "caulking", label: { es: "sellar", en: "sealing" }, ask: { es: "¿Sellar (caulk) al final?", en: "Caulking and sealing?" }, item: "Caulking & sealing", item_es: "Sellar (caulk)", mentioned: /caulk|seal|sell/i },
      { key: "fixtures", label: { es: "accesorios", en: "fixtures" }, ask: { es: "¿Instalar accesorios?", en: "Install fixtures?" }, item: "Fixture installation", item_es: "Instalar accesorios", mentioned: /fixture|accesorio/i },
    ],
  },
  remodel: {
    detect: /remodel|remodela|renovat|addition|ampliaci/i,
    items: [
      permits,
      demolition,
      debris,
      { key: "materials", label: { es: "materiales", en: "materials" }, ask: { es: "¿Cobraste los materiales?", en: "Did you charge for materials?" }, item: "Materials", item_es: "Materiales", mentioned: /material/i },
      { key: "contingency", label: { es: "imprevistos", en: "contingency" }, ask: { es: "¿Agregar un margen para imprevistos?", en: "Add a contingency for surprises?" }, item: "Contingency (unforeseen issues)", item_es: "Imprevistos", mentioned: /contingen|imprevist/i },
    ],
  },
};

/** Unique checklist items for a set of trades — what Paso 1 previews. */
export function checklistFor(trades: TradeId[]): ChecklistItem[] {
  const seen = new Set<string>();
  const out: ChecklistItem[] = [];
  for (const id of trades) {
    if (id === "other") continue;
    for (const item of CHECKLISTS[id].items) {
      if (!seen.has(item.key)) {
        seen.add(item.key);
        out.push(item);
      }
    }
  }
  return out;
}

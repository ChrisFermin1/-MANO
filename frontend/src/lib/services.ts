// Job type ("service") is stored in English for the backend/estimate; Carlos sees it in his language.
const ES: Record<string, string> = {
  "Interior Painting": "Pintura interior",
  "Exterior Painting": "Pintura exterior",
  "Drywall Repair": "Reparación de drywall",
  Flooring: "Pisos",
  Remodeling: "Remodelación",
  "General Work": "Trabajo general",
};

export const serviceLabel = (service: string, lang: "es" | "en") => (lang === "es" ? (ES[service] ?? service) : service);

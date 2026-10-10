// Job type ("service") is stored in English for the backend/estimate; Carlos sees it in his language.
const ES: Record<string, string> = {
  "Interior Painting": "Pintura interior",
  "Exterior Painting": "Pintura exterior",
  "Drywall Repair": "Reparación de drywall",
  Flooring: "Pisos",
  Remodeling: "Remodelación",
  "General Work": "Trabajo general",
};

export const serviceLabel = (service: string, lang: "es" | "en", service_es?: string | null) =>
  lang === "es" ? (ES[service] ?? (service_es || service)) : service;

// Job lists: one job can mix several kinds of work and materials, so lists show WHERE the job is.
// No address yet → the first line of work (in Carlos's language), so the line is never empty.
export function jobSubtitle(
  job: { address: string | null; service: string; service_es?: string | null; line_items: { description: string; description_es?: string | null }[] },
  lang: "es" | "en",
) {
  if (job.address?.trim()) return job.address.trim();
  const first = job.line_items[0];
  const line = lang === "es" ? first?.description_es || first?.description : first?.description || first?.description_es;
  return line?.trim() || serviceLabel(job.service, lang, job.service_es);
}

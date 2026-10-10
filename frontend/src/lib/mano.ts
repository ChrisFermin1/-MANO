import type { Job } from "@/lib/api";
import type { OtherTrade } from "@/lib/business";

export async function interpret(
  description: string,
  otherTrade?: OtherTrade | null,
): Promise<Pick<Job, "customer_name" | "address" | "service" | "line_items">> {
  const response = await fetch("/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description, otherTrade: otherTrade?.name ?? null }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof data?.error === "string" ? data.error : "Mano couldn't organize that job. Please try again.";
    if (response.status === 429) {
      throw new Error(message.includes("busy") ? message : "Mano is busy right now. Please try again shortly.");
    }
    throw new Error(message);
  }
  if (!data || typeof data.service !== "string" || !Array.isArray(data.line_items)) {
    throw new Error("Mano returned incomplete job details. Please try again.");
  }

  return data as Pick<Job, "customer_name" | "address" | "service" | "line_items">;
}

export async function followUpMessage(job: Job, owner: string, business: string, total: string) {
  const response = await fetch("/api/followup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerName: job.customer_name,
      jobTitle: job.service,
      status: job.status,
      missingFields: [],
    }),
  });

  if (!response.ok) {
     return {
      en: "Hi there, just wanted to follow up on your job.",
      es: "Hola, quería darle seguimiento a tu trabajo.",
     };
  }

  const data = await response.json();
  return { en: data.message, es: data.message };
}

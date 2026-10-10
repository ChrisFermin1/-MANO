import type { Job } from "@/lib/api";
import type { OtherTrade } from "@/lib/business";

export async function interpret(
  description: string,
  otherTrade?: OtherTrade | null,
): Promise<Pick<Job, "customer_name" | "address" | "service" | "line_items">> {
  const response = await fetch("/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description }),
  });
  
  if (!response.ok) {
    console.error("Mano extraction API failed");
    return { customer_name: null, address: null, service: "General", line_items: [] };
  }
  
  return response.json();
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

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { generateWithRetry } from "@/lib/gemini";

export const runtime = "nodejs";

// Ojo's "¿se te olvidó cobrar…?" for trades without a built-in checklist (auto repair, roofing,
// landscaping…). Up to 3 questions, never prices. The app asks once per job and saves the answer.
const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    questions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          ask_es: { type: SchemaType.STRING },
          ask_en: { type: SchemaType.STRING },
          item: { type: SchemaType.STRING },
          item_es: { type: SchemaType.STRING },
        },
        required: ["ask_es", "ask_en", "item", "item_es"] as string[],
      },
    },
  },
  required: ["questions"] as string[],
};

const slug = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: "not configured" }, { status: 503 });

  try {
    const body = await request.json();
    const trade = typeof body.trade === "string" ? body.trade.trim().slice(0, 80) : "";
    const service = typeof body.service === "string" ? body.service.trim().slice(0, 120) : "";
    const description = typeof body.description === "string" ? body.description.trim().slice(0, 2000) : "";
    const items: string[] = Array.isArray(body.items)
      ? body.items.filter((i: unknown): i is string => typeof i === "string" && i.trim() !== "").slice(0, 30)
      : [];
    if (!description && !items.length) return NextResponse.json({ questions: [] });

    const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel(
      {
        model: process.env.GEMINI_MODEL || "gemini-flash-lite-latest",
        generationConfig: { responseMimeType: "application/json", responseSchema, temperature: 0.2 },
      },
      { timeout: 20_000 },
    );

    const result = await generateWithRetry(
      model,
      `You are Ojo, a careful assistant for a small Latino contractor in the US.
Suggest up to 3 things that people in this line of work commonly FORGET to include or charge for
on a job like this one: supplies, parts, disposal, prep, diagnostics, permits, cleanup, travel, etc.
Rules:
- Only things relevant to THIS job, and NOT already covered by its items or description.
- Never mention prices or amounts.
- ask_es: a short yes/no question in natural Spanish, starting with "¿" (e.g. "¿Cobrar el diagnóstico?").
- ask_en: the same question in English.
- item: a short English line item for the customer's estimate. item_es: the same in Spanish.
- Return an empty list if nothing useful applies.

Line of work: ${trade || "(not given)"}
Job type: ${service || "(not given)"}
Items on the estimate:
${items.map((i) => `- ${i}`).join("\n") || "(none)"}
What the contractor said:
${description || "(nothing)"}`,
    );

    const data = JSON.parse(result.response.text()) as { questions?: { ask_es: string; ask_en: string; item: string; item_es: string }[] };
    const seen = new Set<string>();
    const questions = (data.questions ?? [])
      .filter((q) => [q.ask_es, q.ask_en, q.item, q.item_es].every((s) => typeof s === "string" && s.trim()))
      .slice(0, 3)
      .map((q) => ({
        key: `ai:${slug(q.item)}`,
        es: q.ask_es.trim(),
        en: q.ask_en.trim(),
        item: q.item.trim(),
        item_es: q.item_es.trim(),
      }))
      .filter((q) => q.key !== "ai:" && !seen.has(q.key) && seen.add(q.key));
    return NextResponse.json({ questions });
  } catch (error) {
    const status = typeof error === "object" && error !== null && "status" in error ? (error as { status?: number }).status : undefined;
    console.warn("Ojo suggestions failed:", status ?? (error instanceof Error ? error.message.slice(0, 200) : error));
    return NextResponse.json({ error: "unavailable" }, { status: status === 429 ? 429 : 502 });
  }
}

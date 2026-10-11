import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { generateWithRetry } from "@/lib/gemini";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    customer_name: { type: SchemaType.STRING, nullable: true },
    customer_name_suggested: { type: SchemaType.STRING, nullable: true },
    address: { type: SchemaType.STRING, nullable: true },
    service: { type: SchemaType.STRING },
    service_es: { type: SchemaType.STRING, nullable: true },
    job_total: { type: SchemaType.NUMBER, nullable: true },
    price_note: { type: SchemaType.STRING, nullable: true },
    price_note_es: { type: SchemaType.STRING, nullable: true },
    line_items: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          description: { type: SchemaType.STRING },
          description_es: { type: SchemaType.STRING, nullable: true },
          amount: { type: SchemaType.NUMBER, nullable: true },
        },
        required: ["description", "description_es", "amount"] as string[],
      },
    },
  },
  required: ["customer_name", "customer_name_suggested", "address", "service", "service_es", "job_total", "price_note", "price_note_es", "line_items"] as string[],
};

export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Mano AI is not configured. Add GEMINI_API_KEY to frontend/.env.local and restart the app." },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const otherTrade = typeof body.otherTrade === "string" ? body.otherTrade.trim() : "";

    if (!description) {
      return NextResponse.json({ error: "Please describe the job first." }, { status: 400 });
    }

    const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = client.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-flash-lite-latest",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.1,
      },
    }, { timeout: 25_000 }); // usually 4–10s, sometimes 15+; past this it's hung — the built-in extractor takes over

    const result = await generateWithRetry(model, `You are Mano, an assistant that extracts residential service job details. The input can be English, Spanish, or a mixture. Return exactly the requested JSON schema. Never make up a customer name, street address, price, or work detail. customer_name is the client: a person OR a company (a property manager, builder, realtor, e.g. "ATL Homes"). It can appear anywhere in the text, including alone on the first or last line with no word like "para" or "for". Copy names exactly as written, without correcting their spelling. If a word in a company name is clearly a misspelled common English word (e.g. "ATL Homeiker" -> "ATL Homemaker", "Roofin Pros" -> "Roofing Pros"), put the corrected full name in customer_name_suggested; otherwise null. Never "correct" people's first or last names. Never use a title like "Estimado de trabajo" or a greeting as a name. address: copy any street address as written, even if short or misspelled (e.g. "636 Wite"). Use null for customer_name and address if they are not in the text. Keep each distinct task or scope detail as a line item, with its price only when explicitly stated; never suggest prices. If the speaker gives ONE total for the whole job instead of a price per item (e.g. "Total 1400$"), put it in job_total and leave every item amount null; otherwise job_total is null. price_note is a short English note about what the price covers ONLY if the speaker said so (e.g. "Labor only", "Materials included"); price_note_es is the same in Spanish; both null if not said. The speaker may misspell trade words or mix English into Spanish (coquin = caulk, stein = stain, leibor = labor); interpret them. Set description to a concise, accurate English translation suitable for a customer estimate, and description_es to a concise Spanish version of the same work (use null only if the work itself cannot be understood). service is a short trade/project label such as Interior Painting or Drywall Repair; if no work is described use an empty string. service_es is the same label in natural Spanish, as a Latino contractor in the US would say it (e.g. Pintura interior, Instalación de ventilador de techo); null if service is empty. Do not include a person’s name or address as work. ${otherTrade ? `The business's other trade is ${otherTrade}.` : ""}\n\nJob description:\n${description}`);

    const data = JSON.parse(result.response.text()) as {
      customer_name: string | null;
      customer_name_suggested: string | null;
      address: string | null;
      service: string;
      service_es: string | null;
      job_total: number | null;
      price_note: string | null;
      price_note_es: string | null;
      line_items: { description: string; description_es: string | null; amount: number | null }[];
    };

    if (!Array.isArray(data.line_items) || typeof data.service !== "string") {
      throw new Error("Gemini returned an invalid job structure");
    }

    const normalized = {
      customer_name: typeof data.customer_name === "string" && data.customer_name.trim() ? data.customer_name.trim() : null,
      customer_name_suggested:
        typeof data.customer_name_suggested === "string" &&
        data.customer_name_suggested.trim() &&
        data.customer_name_suggested.trim().toLowerCase() !== (data.customer_name ?? "").trim().toLowerCase()
          ? data.customer_name_suggested.trim()
          : null,
      address: typeof data.address === "string" && data.address.trim() ? data.address.trim() : null,
      service: data.service.trim() || "General",
      service_es: typeof data.service_es === "string" && data.service_es.trim() ? data.service_es.trim() : null,
      job_total: typeof data.job_total === "number" && Number.isFinite(data.job_total) && data.job_total > 0 ? data.job_total : null,
      price_note: typeof data.price_note === "string" && data.price_note.trim() ? data.price_note.trim() : null,
      price_note_es: typeof data.price_note_es === "string" && data.price_note_es.trim() ? data.price_note_es.trim() : null,
      line_items: data.line_items
        .filter((item) => typeof item.description === "string" && item.description.trim())
        .map((item) => ({
          id: randomUUID(),
          description: item.description.trim(),
          description_es: typeof item.description_es === "string" && item.description_es.trim() ? item.description_es.trim() : null,
          amount: typeof item.amount === "number" && Number.isFinite(item.amount) && item.amount >= 0 ? item.amount : null,
        })),
    };

    return NextResponse.json(normalized);
  } catch (error) {
    const status = typeof error === "object" && error !== null && "status" in error
      ? (error as { status?: number }).status
      : undefined;

    if (status === 429) {
      // free-tier keys allow only a few requests per minute (and per day); the message says which limit
      console.warn("Gemini rate limit:", error instanceof Error ? error.message.slice(0, 400) : error);
      return NextResponse.json(
        { error: "Mano is busy right now. Please try again shortly." },
        { status: 429 },
      );
    }

    console.error("Mano extraction failed:", error);
    return NextResponse.json(
      { error: "Mano couldn't organize that description. Please try again or enter the job details manually." },
      { status: 502 },
    );
  }
}

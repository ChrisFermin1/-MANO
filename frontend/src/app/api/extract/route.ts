import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { generateWithRetry } from "@/lib/gemini";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    customer_name: { type: SchemaType.STRING, nullable: true },
    address: { type: SchemaType.STRING, nullable: true },
    service: { type: SchemaType.STRING },
    service_es: { type: SchemaType.STRING, nullable: true },
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
  required: ["customer_name", "address", "service", "service_es", "line_items"] as string[],
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
      model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.1,
      },
    }, { timeout: 12_000 }); // Gemini sometimes hangs; don't keep Carlos waiting

    const result = await generateWithRetry(model, `You are Mano, an assistant that extracts residential service job details. The input can be English, Spanish, or a mixture. Return exactly the requested JSON schema. Never make up a customer name, street address, price, or work detail. Use null for customer_name and address if they were not explicitly provided. Keep each distinct task or scope detail as a line item, with its price only when explicitly stated; never suggest prices. Set description to a concise, accurate English translation suitable for a customer estimate, and description_es to a concise Spanish version of the same work (use null only if the work itself cannot be understood). service is a short trade/project label such as Interior Painting or Drywall Repair; if no work is described use an empty string. service_es is the same label in natural Spanish, as a Latino contractor in the US would say it (e.g. Pintura interior, Instalación de ventilador de techo); null if service is empty. Do not include a person’s name or address as work. ${otherTrade ? `The business's other trade is ${otherTrade}.` : ""}\n\nJob description:\n${description}`);

    const data = JSON.parse(result.response.text()) as {
      customer_name: string | null;
      address: string | null;
      service: string;
      service_es: string | null;
      line_items: { description: string; description_es: string | null; amount: number | null }[];
    };

    if (!Array.isArray(data.line_items) || typeof data.service !== "string") {
      throw new Error("Gemini returned an invalid job structure");
    }

    const normalized = {
      customer_name: typeof data.customer_name === "string" && data.customer_name.trim() ? data.customer_name.trim() : null,
      address: typeof data.address === "string" && data.address.trim() ? data.address.trim() : null,
      service: data.service.trim() || "General",
      service_es: typeof data.service_es === "string" && data.service_es.trim() ? data.service_es.trim() : null,
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

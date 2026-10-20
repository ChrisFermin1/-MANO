import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateWithRetry } from "@/lib/gemini";

export const runtime = "nodejs";

// Short Spanish text → English for the client (photo captions: "Muro de contención antes de demoler").
// Plain text in, plain text out. If Gemini isn't set up or fails, the app shows the original words.
export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: "not configured" }, { status: 503 });
  try {
    const { text } = await request.json();
    const es = typeof text === "string" ? text.trim().slice(0, 300) : "";
    if (!es) return NextResponse.json({ en: "" });
    const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel(
      { model: process.env.GEMINI_MODEL || "gemini-flash-lite-latest", generationConfig: { temperature: 0.1 } },
      { timeout: 20_000 },
    );
    const result = await generateWithRetry(
      model,
      `Translate this caption from a contractor's photo (painting, remodeling, hardscape, landscaping…) into short,
natural US English for their client. Keep brand names, product names and numbers as they are. If it is already
English, return it unchanged. Reply with the translation only, no quotes.

${es}`,
    );
    return NextResponse.json({ en: result.response.text().trim().replace(/^"|"$/g, "") });
  } catch (error) {
    const status = typeof error === "object" && error !== null && "status" in error ? (error as { status?: number }).status : undefined;
    return NextResponse.json({ error: "unavailable" }, { status: status === 429 ? 429 : 502 });
  }
}

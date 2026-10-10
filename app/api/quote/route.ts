// ── Quote Builder API route ───────────────────────────────────────────────────
// Receives job notes from the contractor and returns 3 quote options via Gemini.
//
// ENDPOINT: POST /api/quote
// BODY:     { notes, trade, businessName, preferredLanguage }
// RETURNS:  { quotes: [{ tier, title, description, price, includes }] }

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateWithRetry } from "@/lib/gemini";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

interface QuoteOption {
  tier: "basic" | "standard" | "premium";
  title: string;
  description: string;
  price: string;
  includes: string[];
  breakdown: { item: string; cost: string; explanation: string }[];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      notes: string;
      trade: string;
      businessName: string;
      preferredLanguage: "en" | "es";
    };

    const language = body.preferredLanguage === "es" ? "Spanish" : "English";

    const prompt = `
You are Mano, an AI assistant for a professional contracting business called "${body.businessName}" specializing in ${body.trade}.

The contractor has described a job with these notes:
"${body.notes}"

Generate exactly 3 quote options in ${language}: Basic, Standard, and Premium.

For each option, you MUST perform a detailed cost analysis. Consider labor hours, material costs, overhead, and profit margins.

Return ONLY valid JSON — no markdown, no explanation, just the JSON object:
{
  "quotes": [
    {
      "tier": "basic",
      "title": "...",
      "description": "1 sentence description",
      "price": "$total_price",
      "includes": ["item 1", "item 2"],
      "breakdown": [
        {"item": "Labor", "cost": "$...", "explanation": "Reasoning for labor cost"},
        {"item": "Materials", "cost": "$...", "explanation": "Reasoning for material cost"},
        {"item": "Overhead/Profit", "cost": "$...", "explanation": "Reasoning for margin"}
      ]
    },
    ... (repeat for standard and premium)
  ]
}

- Basic: Conservative pricing, essential scope.
- Standard: Market rate, full scope.
- Premium: Full service, premium materials, warranty included.
- Be specific to the job described in the notes.
    `.trim();

    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL ?? "gemini-3.8-flash" });
    const result = await generateWithRetry(model, prompt);
    let text = result.response.text().trim();

    // Strip markdown code fences if Gemini wraps in ```json ... ```
    text = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

    const parsed = JSON.parse(text) as { quotes: QuoteOption[] };
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Quote generation error:", err);
    return NextResponse.json({ error: "Failed to generate quotes" }, { status: 500 });
  }
}

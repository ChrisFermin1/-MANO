// ── Quote Builder API route ───────────────────────────────────────────────────
// Receives job notes from the contractor and returns 3 quote options via Gemini.
//
// ENDPOINT: POST /api/quote
// BODY:     { notes, trade, businessName, preferredLanguage }
// RETURNS:  { quotes: [{ tier, title, description, price, includes }] }

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();

    // Strip markdown code fences if Gemini wraps in ```json ... ```
    text = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

    const parsed = JSON.parse(text) as { quotes: QuoteOption[] };
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Quote generation error:", err);
    // Return fallback quotes so the UI never breaks
    return NextResponse.json({
      quotes: [
        {
          tier: "basic",
          title: "Essential Service",
          description: "Core work completed to specification.",
          price: "$300–$500",
          includes: ["Labour", "Standard materials", "Site cleanup"],
        },
        {
          tier: "standard",
          title: "Full Service",
          description: "Complete job with quality materials and warranty.",
          price: "$600–$900",
          includes: ["Labour", "Premium materials", "Site cleanup", "1-year warranty"],
        },
        {
          tier: "premium",
          title: "White Glove",
          description: "Top-tier finish, priority scheduling, extended warranty.",
          price: "$1,000–$1,500",
          includes: ["Labour", "Top-grade materials", "Site cleanup", "2-year warranty", "Priority scheduling"],
        },
      ],
    });
  }
}

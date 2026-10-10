// ── Gemini onboarding API route ───────────────────────────────────────────────
//
// HOW GEMINI WORKS (plain English):
//   1. You send a text prompt to Google's Gemini model via their SDK
//   2. Gemini streams or returns a text response
//   3. That's it — it's just an HTTP call to Google's servers
//
// WHY SERVER-SIDE:
//   The GEMINI_API_KEY must NEVER be sent to the browser.
//   We keep it here in a Next.js API Route (runs on the server only),
//   so the key stays secret and the browser just gets the result.
//
// ENDPOINT: POST /api/onboarding
// BODY:     { name, businessName, trade, yearsExp, topChallenge, preferredLanguage }
// RETURNS:  { welcomeMessage: string }

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialise the Gemini client with your API key.
// process.env.GEMINI_API_KEY is read from .env.local (local) or Replit Secrets.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      name: string;
      preferredLanguage: "en" | "es";
      businessName: string;
      trade: string;
      yearsExp: string;
      teamSize: string;
      serviceArea: string;
      avgJobValue: string;
      topChallenge: string;
      currentTools: string;
      goal: string;
    };

    const language = body.preferredLanguage === "es" ? "Spanish" : "English";

    const prompt = `
You are Mano, a friendly AI assistant for small contracting businesses.

A contractor just completed onboarding. Here is their full profile:
- Name: ${body.name}
- Business: ${body.businessName} (${body.trade})
- Experience: ${body.yearsExp} in business, team of ${body.teamSize}
- Service area: ${body.serviceArea}
- Average job value: ${body.avgJobValue}
- How customers find them: ${body.currentTools || "not specified"}
- Biggest challenge: ${body.topChallenge}
- Goal for next 6 months: ${body.goal}

Write a warm, personalised 2-3 sentence welcome message in ${language}.
Then give ONE specific, actionable tip that directly addresses their challenge and helps them reach their goal.
Keep it under 120 words. Be conversational and encouraging, not corporate.
No bullet points — just natural sentences.
    `.trim();

    // ── Call Gemini ─────────────────────────────────────────────────────────
    // gemini-3.8-flash is fast and free-tier friendly — good for a hackathon.
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL ?? "gemini-3.8-flash" });
    const result = await model.generateContent(prompt);
    const welcomeMessage = result.response.text();

    return NextResponse.json({ welcomeMessage });
  } catch (err) {
    console.error("Gemini error:", err);
    return NextResponse.json(
      { error: "Failed to generate welcome message" },
      { status: 500 }
    );
  }
}

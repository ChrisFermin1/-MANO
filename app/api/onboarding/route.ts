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
      businessName: string;
      trade: string;
      yearsExp: string;
      topChallenge: string;
      preferredLanguage: "en" | "es";
    };

    // ── Build the prompt ────────────────────────────────────────────────────
    // This is the instruction we send to Gemini.
    // The model will generate a personalised welcome + first tip.
    const language = body.preferredLanguage === "es" ? "Spanish" : "English";

    const prompt = `
You are Mano, a friendly AI assistant for small contracting businesses.

A contractor just signed up. Here is their profile:
- Name: ${body.name}
- Business name: ${body.businessName}
- Trade: ${body.trade}
- Years of experience: ${body.yearsExp}
- Biggest challenge right now: ${body.topChallenge}

Write a warm, encouraging 2-3 sentence welcome message in ${language}.
Then give them ONE specific, practical tip for their trade that directly addresses their challenge.
Keep the total response under 100 words. Be conversational, not corporate.
Do NOT use bullet points. Just natural sentences.
    `.trim();

    // ── Call Gemini ─────────────────────────────────────────────────────────
    // gemini-1.5-flash is fast and free-tier friendly — good for a hackathon.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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

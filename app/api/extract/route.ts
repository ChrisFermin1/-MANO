// ── Mano extraction API route ─────────────────────────────────────────────────
// Receives a natural-language job description and returns structured JSON.
// Uses Gemini to understand English and Spanish input.
//
// ENDPOINT: POST /api/extract
// BODY:     { description: string }
// RETURNS:  ManoExtraction (all fields present, null if not found)

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ManoExtraction } from "@/lib/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

export async function POST(req: NextRequest) {
  try {
    const { description } = await req.json() as { description: string };

    if (!description?.trim()) {
      return NextResponse.json({ error: "description is required" }, { status: 400 });
    }

    const prompt = `
You are Mano, an AI assistant for a contracting business.

Extract structured information from this job description. Return ONLY valid JSON with exactly these fields.
Use null for anything not mentioned — never guess or hallucinate values.

Description: "${description}"

Return this exact JSON structure (no markdown, no explanation):
{
  "service": "type of service (e.g. Interior Painting, Plumbing, Roofing) or null",
  "customer_name": "customer first name or full name or null",
  "rooms": number of rooms as integer or null,
  "trim_repair": true if trim repair mentioned, false if explicitly not, null if not mentioned,
  "start_date": "ISO date YYYY-MM-DD if a date is mentioned, null otherwise",
  "price": dollar amount as number (no $), null if not mentioned,
  "address": "full street address if mentioned, null otherwise"
}

Rules:
- For dates: 10/14/2026 → "2026-10-14", "October 14" → "2026-10-14" (use current year if no year given)
- For price: "$700" or "700 dollars" or "charge 700" → 700
- For customer: "Juan wants", "for Maria", "client is Tom" → extract just the name
- For address: extract the full address as written
- Return ONLY the JSON object, nothing else.
    `.trim();

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();

    // Strip markdown fences if Gemini wraps the response
    text = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

    const parsed = JSON.parse(text) as ManoExtraction;
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Extraction error:", err);
    // Return all-null extraction so the UI can still show editable fields
    const fallback: ManoExtraction = {
      service: null, customer_name: null, rooms: null,
      trim_repair: null, start_date: null, price: null, address: null,
    };
    return NextResponse.json(fallback);
  }
}

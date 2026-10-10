// ── Follow-up message API route ───────────────────────────────────────────────
// Generates a short, professional follow-up message for a contractor to send
// to a customer based on the job context.
//
// ENDPOINT: POST /api/followup
// BODY:     { customerName, jobTitle, status, missingFields }
// RETURNS:  { message: string }

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

export async function POST(req: NextRequest) {
  let customerName = "there";
  let jobTitle = "your job";

  try {
    const body = await req.json() as {
      customerName: string;
      jobTitle: string;
      status: string;
      missingFields: string[];
    };

    customerName = body.customerName ?? "there";
    jobTitle = body.jobTitle ?? "your job";
    const { status, missingFields } = body;

    const contextHints: Record<string, string> = {
      needs_information: "The contractor needs more information before they can send a quote.",
      ready_for_quote: "The job is ready to be quoted.",
      quote_sent: "A quote was sent and the contractor is following up to see if the customer is interested.",
      accepted: "The customer accepted the quote and the contractor is scheduling the job.",
      in_progress: "The job is currently in progress.",
      completed: "The job is done and payment has not yet been received.",
      payment_pending: "The job is complete and payment is due.",
    };

    const context = contextHints[status] ?? "The contractor is following up on a job.";
    const missingNote = missingFields.length > 0
      ? ` The contractor still needs the customer's: ${missingFields.join(", ")}.`
      : "";

    const prompt = `
You are Mano, an AI assistant for a contracting business.

Write a short, friendly, professional follow-up text message from the contractor to their customer.

Customer name: ${customerName}
Job: ${jobTitle}
Situation: ${context}${missingNote}

Rules:
- 2–4 sentences maximum
- Friendly but professional tone
- Written in first person (as the contractor)
- End with an invitation to respond
- Do NOT include a subject line or greeting like "Subject:"
- Return ONLY the message text, nothing else

`.trim();

    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL ?? "gemini-3.8-flash" });
    const result = await model.generateContent(prompt);
    const message = result.response.text().trim();

    return NextResponse.json({ message });
  } catch (err) {
    console.error("Follow-up generation error:", err);
    return NextResponse.json({ error: "Failed to generate follow-up" }, { status: 500 });
  }
}

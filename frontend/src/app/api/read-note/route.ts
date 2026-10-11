import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { generateWithRetry } from "@/lib/gemini";

export const runtime = "nodejs";

// "Escanear una nota": a photo of a handwritten estimate, a notebook page or a WhatsApp screenshot.
// Gemini copies the note word for word (no translating, no fixing). The app puts that text in the
// "Nuevo trabajo" box so Carlos checks it, then Mano organizes it like anything he typed.
const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    text: { type: SchemaType.STRING },
    is_job_note: { type: SchemaType.BOOLEAN },
  },
  required: ["text", "is_job_note"] as string[],
};

const MAX_BYTES = 6 * 1024 * 1024; // the app shrinks photos first; this only stops oversized uploads
const MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: "not configured" }, { status: 503 });

  let image: string;
  let mimeType: string;
  try {
    const body = await request.json();
    image = typeof body.image === "string" ? body.image : "";
    mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!image || !MIME_TYPES.has(mimeType)) return NextResponse.json({ error: "bad image" }, { status: 400 });
  if ((image.length * 3) / 4 > MAX_BYTES) return NextResponse.json({ error: "too large" }, { status: 413 });

  try {
    const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel(
      {
        model: process.env.GEMINI_MODEL || "gemini-flash-lite-latest",
        generationConfig: { responseMimeType: "application/json", responseSchema, temperature: 0 },
      },
      { timeout: 25_000 },
    );
    const result = await generateWithRetry(model, [
      {
        text: `This is a photo from a contractor: a handwritten estimate, a notebook page, a printed note, or a
screenshot of a chat. Copy the text about the job EXACTLY as written: same words, same spelling mistakes,
same mix of Spanish and English, same numbers and symbols ("1400$"). Keep one line per line of the note
(numbered or bulleted items stay on their own lines). Do not translate, correct, summarize or add anything.
Leave out things that are not part of the note (phone status bar, app buttons, timestamps, chat names
unless they are the client). Unreadable words: write your best reading followed by "(?)".
is_job_note: true if the photo contains a note about work, a job, a client or a price; false otherwise
(then text can be empty).`,
      },
      { inlineData: { data: image, mimeType } },
    ]);
    const data = JSON.parse(result.response.text()) as { text?: string; is_job_note?: boolean };
    const text = typeof data.text === "string" ? data.text.trim().slice(0, 4000) : "";
    return NextResponse.json({ text: data.is_job_note ? text : "", isJobNote: !!data.is_job_note && !!text });
  } catch (error) {
    const status = typeof error === "object" && error !== null && "status" in error ? (error as { status?: number }).status : undefined;
    console.warn("Reading the note failed:", status ?? (error instanceof Error ? error.message.slice(0, 200) : error));
    return NextResponse.json({ error: "unavailable" }, { status: status === 429 ? 429 : 502 });
  }
}

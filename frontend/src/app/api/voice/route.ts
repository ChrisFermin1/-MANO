import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Mano's mic: the recording goes to ElevenLabs speech-to-text and the words come back.
// Same job as the backend's /api/voice/transcribe, but served by this app, so it works without
// the backend running and on a phone over the https link. The key never leaves the server.
const MAX_BYTES = 20 * 1024 * 1024; // ~10 minutes of voice; a note is usually under a minute
const TIMEOUT_MS = 30_000;

export async function POST(request: NextRequest) {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) return NextResponse.json({ detail: "not configured" }, { status: 503 });

  let file: File;
  try {
    const form = await request.formData();
    const value = form.get("file");
    if (!(value instanceof File) || value.size === 0) return NextResponse.json({ detail: "Empty audio file" }, { status: 400 });
    file = value;
  } catch {
    return NextResponse.json({ detail: "bad request" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) return NextResponse.json({ detail: "too large" }, { status: 413 });

  const body = new FormData();
  body.append("model_id", process.env.ELEVENLABS_STT_MODEL || "scribe_v1");
  body.append("tag_audio_events", "false"); // no "(laughs)" or "(music)" in Carlos's note
  body.append("file", file, file.name || "audio.webm");

  try {
    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": key },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      console.warn("ElevenLabs transcription failed:", response.status, (await response.text()).slice(0, 200));
      return NextResponse.json({ detail: "unavailable" }, { status: response.status === 429 ? 429 : 502 });
    }
    const data = (await response.json()) as { text?: string };
    return NextResponse.json({ text: typeof data.text === "string" ? data.text.trim() : "" });
  } catch (error) {
    console.warn("ElevenLabs transcription failed:", error instanceof Error ? error.name : error);
    return NextResponse.json({ detail: "unavailable" }, { status: 502 });
  }
}

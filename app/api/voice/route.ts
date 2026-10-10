// ── ElevenLabs Text-to-Speech API route ──────────────────────────────────────
//
// HOW ELEVENLABS WORKS:
//   1. You send text + a voice ID to ElevenLabs' API
//   2. They return an MP3 audio stream
//   3. We pipe that stream back to the browser
//   4. The browser plays it — contractor hears Mano speaking
//
// WHY SERVER-SIDE:
//   ELEVENLABS_API_KEY must never go to the browser.
//   This route keeps the key on the server and proxies the audio.
//
// ENDPOINT: POST /api/voice
// BODY:     { text: string, voiceId?: string }
// RETURNS:  audio/mpeg stream

import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY ?? "",
});

// "Rachel" — warm, clear, professional. Great for a contractor assistant.
// Browse voices at https://elevenlabs.io/voice-library
// Replace with any voice ID from your ElevenLabs account.
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { text: string; voiceId?: string };

    if (!body.text?.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    // Cap at 500 chars to stay within free-tier quota
    const text = body.text.slice(0, 500);
    const voiceId = body.voiceId ?? DEFAULT_VOICE_ID;

    // Call ElevenLabs — returns a Web ReadableStream of MP3 audio
    const audioStream = await client.textToSpeech.convert(voiceId, {
      text,
      modelId: "eleven_turbo_v2_5", // fastest + cheapest — good for hackathon
      outputFormat: "mp3_44100_128",
    });

    // Collect the ReadableStream into a Buffer using a reader
    const reader = audioStream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const audioBuffer = Buffer.concat(chunks);

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("ElevenLabs error:", err);
    return NextResponse.json(
      { error: "Voice generation failed" },
      { status: 500 }
    );
  }
}

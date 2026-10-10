"use client";

// ── VoiceButton ───────────────────────────────────────────────────────────────
// Reusable component — give any text a voice with one tap.
// Calls /api/voice (server route) → ElevenLabs TTS → plays in browser.
//
// Usage:
//   <VoiceButton text="Follow up with Maria on the bathroom tile quote." />

import { useState, useRef } from "react";
import { Volume2, Loader2, VolumeX } from "lucide-react";

interface VoiceButtonProps {
  text: string;
  label?: string;       // optional button label — defaults to icon only
  className?: string;
}

type State = "idle" | "loading" | "playing";

export default function VoiceButton({ text, label, className = "" }: VoiceButtonProps) {
  const [state, setState] = useState<State>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function handleClick() {
    // If already playing — stop
    if (state === "playing") {
      audioRef.current?.pause();
      audioRef.current = null;
      setState("idle");
      return;
    }

    setState("loading");

    try {
      // POST to our server route — keeps the API key server-side
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error("Voice API failed");

      // Convert the MP3 response into a blob URL and play it
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setState("idle");
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setState("idle");
        URL.revokeObjectURL(url);
      };

      await audio.play();
      setState("playing");
    } catch {
      setState("idle");
    }
  }

  const icon =
    state === "loading" ? (
      <Loader2 className="h-4 w-4 animate-spin" />
    ) : state === "playing" ? (
      <VolumeX className="h-4 w-4" />
    ) : (
      <Volume2 className="h-4 w-4" />
    );

  const title =
    state === "loading" ? "Generating audio…" :
    state === "playing" ? "Tap to stop" :
    "Hear this";

  return (
    <button
      onClick={handleClick}
      disabled={state === "loading"}
      title={title}
      aria-label={title}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        state === "playing" ? "border-purple-300 bg-purple-50 text-purple-700" : ""
      } ${className}`}
    >
      {icon}
      {label && <span>{state === "loading" ? "Loading…" : state === "playing" ? "Stop" : label}</span>}
    </button>
  );
}

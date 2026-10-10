"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mic, RotateCcw, Sparkles, Trash2, Undo2 } from "lucide-react";
import { PageHeader, Screen, Title, btnPrimary } from "@/components/ui";
import { createJob } from "@/lib/api";
import { useLang } from "@/lib/i18n";

const chip =
  "flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-forest transition active:scale-[0.97]";

const EXAMPLE ="Pintar la sala y cocina para Maria Lopez, dos manos, y reparar una grieta en la pared.";

export default function NuevoTrabajo() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [justCleared, setJustCleared] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const formData = new FormData();
          formData.append("file", audioBlob, "audio.webm");

          try {
            const response = await fetch("http://localhost:8000/api/voice/transcribe", {
              method: "POST",
              body: formData,
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
              const detail = typeof data.detail === "string" ? data.detail : response.statusText;
              throw new Error(detail || "Transcription failed");
            }
            if (data.text) {
              setText((t) => (t ? `${t} ${data.text}` : data.text));
              setVoiceError("");
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : "Transcription failed";
            setVoiceError(message);
            console.error("Transcription failed:", err);
          } finally {
            stream.getTracks().forEach(track => track.stop());
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
    } catch (err) {
        console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    mediaRecorderRef.current?.stop();
  };

  const toggleMic = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const removeLast = () => {
    setText(history[history.length - 1] ?? "");
    setHistory((h) => h.slice(0, -1));
  };

  const clearAll = () => {
    if (text) setHistory((h) => [...h, text]);
    setText("");
    setJustCleared(true);
  };

  const undoClear = () => {
    removeLast();
    setJustCleared(false);
  };

  const submit = async () => {
    setBusy(true);
    const job = await createJob(text.trim());
    router.push(`/trabajos/${job.id}`);
  };

  if (busy) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-forest px-8 text-center text-white">
        <Loader2 className="size-10 animate-spin text-lime" />
        <p className="font-serif text-[28px] leading-8">{t.thinking}</p>
      </main>
    );
  }

  return (
    <Screen>
      <PageHeader backHref="/inicio" />
      <Title>{t.newJob}</Title>
      <p className="mt-2 text-base leading-5">{t.newJobBody}</p>

      <button
        type="button"
        onClick={toggleMic}
        aria-pressed={isRecording}
        className="mt-8 flex flex-col items-center gap-3 self-center"
      >
        <span
          className={`flex size-[88px] items-center justify-center rounded-full transition ${
            isRecording ? "bg-forest ring-8 ring-lime/40" : "bg-lime"
          }`}
        >
          <Mic className={`size-10 ${isRecording ? "animate-pulse text-lime" : "text-forest"}`} strokeWidth={2} />
        </span>
        <span className="text-sm font-semibold">{isRecording ? t.listening : t.tapToTalk}</span>
      </button>

      {voiceError && (
        <p role="alert" className="mt-3 text-center text-sm font-semibold text-[#8a2a17]">
          {voiceError}
        </p>
      )}

      <div className="relative mt-6">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.newJobPlaceholder}
          rows={6}
          className="w-full resize-none rounded-[20px] bg-white p-5 text-base leading-6 outline-none ring-forest/60 placeholder:text-muted focus:ring-2"
        />
      </div>

      {text && !isRecording && (
        <div className="mt-3 flex flex-wrap gap-2">
          {history.length > 0 && (
            <button type="button" onClick={removeLast} className={chip}>
              <Undo2 className="size-4" strokeWidth={2.25} /> {t.removeLast}
            </button>
          )}
          <button type="button" onClick={clearAll} className={`${chip} text-[#8a2a17]`}>
            <Trash2 className="size-4" strokeWidth={2.25} /> {t.clearAll}
          </button>
        </div>
      )}

      {justCleared && !text && (
        <div role="status" className="mt-3 flex items-center justify-between rounded-[14px] bg-forest px-4 py-3 text-sm text-white">
          {t.cleared}
          <button type="button" onClick={undoClear} className="font-bold text-lime">
            {t.undo}
          </button>
        </div>
      )}

      {!text && !justCleared && (
        <button
          type="button"
          onClick={() => {
            setText(EXAMPLE);
          }}
          className="mt-2 self-start text-sm font-semibold text-forest underline underline-offset-4"
        >
          {t.tryExample}
        </button>
      )}

      <div className="mt-auto pt-8">
        <button type="button" onClick={submit} disabled={!text.trim()} className={btnPrimary}>
          <Sparkles className="size-5" strokeWidth={2.5} />
          {t.organize}
        </button>
      </div>
    </Screen>
  );
}

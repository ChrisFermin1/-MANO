"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Mic, RotateCcw, Sparkles, Trash2, Undo2 } from "lucide-react";
import { PageHeader, Screen, Title, btnPrimary } from "@/components/ui";
import { createJob } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { ManoBusyError, ManoBusyReadingError, organizeAhead, readNote } from "@/lib/mano";
import { loadBusiness } from "@/lib/business";
import { NoteScanner, canUseLiveCamera } from "@/components/note-scanner";

// ElevenLabs voice (backend). Default: port 8000 on the same machine that serves this page,
// so it also works from a phone on the Wi-Fi. If it fails, the phone's own speech recognition takes over.
const voiceUrl = () =>
  process.env.NEXT_PUBLIC_VOICE_URL || `${window.location.protocol}//${window.location.hostname}:8000/api/voice/transcribe`;

// Equal-width buttons in one row (2 or 3 of them), icon above the label so long Spanish labels fit on a phone
const chip =
  "flex h-[60px] flex-col items-center justify-center gap-1 rounded-[16px] glass px-1 text-[13px] font-semibold leading-4 text-balance transition active:scale-[0.97]";

const EXAMPLE ="Pintar la sala y cocina para Maria Lopez, dos manos, y reparar una grieta en la pared.";

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
};

function getRecognition(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const browser = window as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition ?? null;
}

export default function NuevoTrabajo() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [canListen, setCanListen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [justCleared, setJustCleared] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [submitError, setSubmitError] = useState("");
  // "Escanear una nota": a photo of a paper estimate or a WhatsApp screenshot → its text in the box
  const [reading, setReading] = useState(false);
  const [scanMessage, setScanMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false); // live camera with the paper outline (https only)
  // what Carlos is writing: an estimate (before the work) or an invoice (work already done)
  const [docKind, setDocKind] = useState<"estimate" | "invoice">("estimate");
  const rec = useRef<Recognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const useBrowserSpeech = useRef(false);
  const textRef = useRef("");

  useEffect(() => {
    setCanListen(typeof MediaRecorder !== "undefined" || getRecognition() !== null);
  }, []);
  useEffect(() => {
    textRef.current = text;
  }, [text]);
  useEffect(() => {
    if (!justCleared) return;
    const id = setTimeout(() => setJustCleared(false), 6000);
    return () => clearTimeout(id);
  }, [justCleared]);

  const scanNote = async (file: File | undefined) => {
    if (!file) return;
    setReading(true);
    setScanMessage(null);
    try {
      const note = await readNote(file);
      if (note === null) setScanMessage({ kind: "error", text: t.scanFailed });
      else if (!note.trim()) setScanMessage({ kind: "error", text: t.scanNoNote });
      else {
        appendText(note);
        setScanMessage({ kind: "ok", text: t.scanRead });
        // start organizing now, while Carlos reads it; "Mano, organízalo" then has the answer ready
        organizeAhead(textRef.current, loadBusiness()?.otherTrade);
      }
    } catch (error) {
      setScanMessage({ kind: "error", text: error instanceof ManoBusyReadingError ? t.extractBusy : t.scanFailed });
    } finally {
      setReading(false);
      if (photoInput.current) photoInput.current.value = ""; // same photo can be picked again
    }
  };

  const appendText = (addition: string) => {
    const previous = textRef.current;
    const next = `${previous}${previous && !previous.endsWith(" ") ? " " : ""}${addition.trim()}`;
    textRef.current = next;
    setHistory((items) => [...items, previous]);
    setText(next);
  };

  // Fallback: browser speech recognition
  const startBrowserSpeech = () => {
    const RecognitionConstructor = getRecognition();
    if (!RecognitionConstructor) return;

    const recognition = new RecognitionConstructor();
    recognition.lang = lang === "es" ? "es-US" : "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      if (finalText) appendText(finalText);
      setInterim(interimText);
    };
    recognition.onend = () => {
      if (rec.current !== recognition) return;
      rec.current = null;
      setIsRecording(false);
      setInterim("");
    };
    rec.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  // Main: record audio and send it to the ElevenLabs backend
  const startRecording = async () => {
    setVoiceError("");

    if (useBrowserSpeech.current || typeof MediaRecorder === "undefined") {
      startBrowserSpeech();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setTranscribing(true);
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const formData = new FormData();
          formData.append("file", audioBlob, "audio.webm");

          const response = await fetch(voiceUrl(), {
            method: "POST",
            body: formData,
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            const detail = typeof data.detail === "string" ? data.detail : response.statusText;
            throw new Error(detail || "Transcription failed");
          }
          if (data.text) appendText(data.text);
        } catch (err) {
          console.warn("ElevenLabs transcription failed:", err);
          if (getRecognition()) {
            useBrowserSpeech.current = true;
            setVoiceError(t.voiceRetry);
          } else {
            setVoiceError(t.voiceFailed);
          }
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setVoiceError(t.micDenied);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    rec.current?.stop();
  };

  const toggleMic = () => {
    if (transcribing) return;
    if (isRecording) stopRecording();
    else startRecording();
  };

  const recordAgain = () => {
    clearAll();
    setJustCleared(false);
    startRecording();
  };

  const removeLast = () => {
    const previous = history[history.length - 1] ?? "";
    textRef.current = previous;
    setText(previous);
    setHistory((h) => h.slice(0, -1));
  };

  const clearAll = () => {
    if (text) setHistory((h) => [...h, text]);
    textRef.current = "";
    setText("");
    setJustCleared(true);
  };

  const undoClear = () => {
    removeLast();
    setJustCleared(false);
  };

  const submit = async () => {
    if (!text.trim() || busy || isRecording || transcribing) return;
    setBusy(true);
    setSubmitError("");
    try {
      const job = await createJob(text.trim(), { docIntent: docKind });
      router.push(`/trabajos/${job.id}`);
    } catch (err) {
      setSubmitError(err instanceof ManoBusyError ? t.extractBusy : t.extractError);
      setBusy(false);
    }
  };

  if (busy) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-mano-dark px-8 text-center text-white">
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

      <div role="tablist" aria-label={t.docKindLabel} className="glass mt-5 grid grid-cols-2 rounded-[14px] p-1 text-sm font-semibold">
        {(["estimate", "invoice"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={docKind === k}
            onClick={() => setDocKind(k)}
            className={`min-h-10 rounded-[10px] px-2 py-1.5 leading-4 transition ${docKind === k ? "bg-forest text-lime" : "text-black/60"}`}
          >
            {k === "estimate" ? t.docEstimate : t.docInvoice}
          </button>
        ))}
      </div>

      {canListen && (
        <button
          type="button"
          onClick={toggleMic}
          disabled={transcribing}
          aria-pressed={isRecording}
          className="mt-8 flex flex-col items-center gap-3 self-center"
        >
          <span
            className={`flex size-[88px] items-center justify-center rounded-full transition ${
              isRecording ? "bg-forest ring-8 ring-lime/40 glow-lime" : "bg-lime glow-lime"
            }`}
          >
            {transcribing ? (
              <Loader2 className="size-10 animate-spin text-forest" strokeWidth={2} />
            ) : (
              <Mic className={`size-10 ${isRecording ? "animate-pulse text-lime" : "text-forest"}`} strokeWidth={2} />
            )}
          </span>
          <span className="text-sm font-semibold">
            {transcribing ? t.thinking : isRecording ? t.listening : t.tapToTalk}
          </span>
        </button>
      )}

      {/* Escanear una nota: camera or photo library (no "capture" attribute, so WhatsApp screenshots work too) */}
      <input
        ref={photoInput}
        id="f-note-photo"
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => void scanNote(e.target.files?.[0])}
        disabled={reading}
      />
      <button
        type="button"
        onClick={() => (canUseLiveCamera() ? setScanning(true) : photoInput.current?.click())}
        disabled={reading || isRecording || transcribing}
        className="mt-4 flex h-11 items-center justify-center gap-2 self-center rounded-full glass px-5 text-sm font-semibold text-forest transition active:scale-[0.97] disabled:opacity-50"
      >
        {reading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" strokeWidth={2.25} />}
        {reading ? t.scanReading : t.scanNote}
      </button>
      {scanning && (
        <NoteScanner
          onCapture={(photo) => {
            setScanning(false);
            void scanNote(photo);
          }}
          onClose={() => setScanning(false)}
          onPickPhoto={() => {
            setScanning(false);
            photoInput.current?.click();
          }}
        />
      )}
      {scanMessage && (
        <p
          role={scanMessage.kind === "error" ? "alert" : "status"}
          className={`mt-2 text-center text-sm font-semibold ${scanMessage.kind === "error" ? "text-[#8a2a17]" : "text-forest"}`}
        >
          {scanMessage.text}
        </p>
      )}

      {voiceError && (
        <p role="alert" className="mt-3 text-center text-sm font-semibold text-[#8a2a17]">
          {voiceError}
        </p>
      )}

      <div className="relative mt-6">
        <textarea
          value={interim ? `${text} ${interim}` : text}
          onChange={(e) => {
            textRef.current = e.target.value;
            setText(e.target.value);
          }}
          placeholder={t.newJobPlaceholder}
          rows={5}
          className="block min-h-[148px] w-full resize-none rounded-[16px] glass-field px-4 py-3.5 text-base leading-6 outline-none ring-forest/60 placeholder:text-muted focus:ring-2"
        />
      </div>

      {text && !isRecording && !transcribing && (
        <div className="mt-3 grid auto-cols-fr grid-flow-col gap-2">
          {history.length > 0 && (
            <button type="button" onClick={removeLast} className={`${chip} text-forest`}>
              <Undo2 className="size-[18px]" strokeWidth={2.25} />
              {t.removeLast}
            </button>
          )}
          {canListen && (
            <button type="button" onClick={recordAgain} className={`${chip} text-forest`}>
              <RotateCcw className="size-[18px]" strokeWidth={2.25} />
              {t.recordAgain}
            </button>
          )}
          <button type="button" onClick={clearAll} className={`${chip} text-[#8a2a17]`}>
            <Trash2 className="size-[18px]" strokeWidth={2.25} />
            {t.clearAll}
          </button>
        </div>
      )}

      {justCleared && !text && (
        <div role="status" className="mt-3 flex items-center justify-between rounded-[14px] glass-forest px-4 py-3 text-sm text-white">
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
            textRef.current = EXAMPLE;
            setHistory((items) => [...items, text]);
            setText(EXAMPLE);
          }}
          className="mt-3 self-start text-sm font-semibold text-forest underline underline-offset-4"
        >
          {t.tryExample}
        </button>
      )}

      {submitError && (
        <p role="alert" className="mt-4 rounded-[14px] bg-[#fff0ed] px-4 py-3 text-sm font-semibold text-[#8a2a17]">
          {submitError}
        </p>
      )}

      <div className="mt-auto pt-8">
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim() || isRecording || transcribing}
          className={btnPrimary}
        >
          <Sparkles className="size-5" strokeWidth={2.5} />
          {t.organize}
        </button>
      </div>
    </Screen>
  );
}

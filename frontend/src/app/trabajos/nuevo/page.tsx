"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Mic, PencilLine, RotateCcw, Sparkles, Trash2, Undo2, UserRound, X, Image as ImageIcon, FileText, Receipt } from "lucide-react";
import { PageHeader, Screen, Title, btnGhost, btnPrimary } from "@/components/ui";
import { createBlankJob, createJob, getJobs } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { ManoBusyError, ManoBusyReadingError, organizeAhead, readNote } from "@/lib/mano";
import { loadBusiness } from "@/lib/business";
import { clientFromLink, groupClients, loadSavedClients, type ClientPick } from "@/lib/clients";
import { NoteScanner, canUseLiveCamera } from "@/components/note-scanner";

// ElevenLabs voice, through this app's own /api/voice (works on a phone over the https link, no backend needed).
// If it fails, the phone's own speech recognition takes over.
const voiceUrl = () => process.env.NEXT_PUBLIC_VOICE_URL || "/api/voice";

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
  // what Carlos is writing: an estimate (before the work) or an invoice (work already done).
  // Nothing pre-selected: he picks on Home ("+ Estimado" / "+ Factura") or on this screen first.
  const [docKind, setDocKind] = useState<"estimate" | "invoice" | null>(null);
  const [blanking, setBlanking] = useState(false); // "Prefiero llenarlo yo" tapped: opening the empty form
  // Started from a client card ("Nuevo trabajo para Maria"): the job is for them, whatever the note says
  const [client, setClient] = useState<ClientPick | null>(null);
  const rec = useRef<Recognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const useBrowserSpeech = useRef(false);
  const textRef = useRef("");

  useEffect(() => {
    setCanListen(typeof MediaRecorder !== "undefined" || getRecognition() !== null);
    // "+ Estimado" / "+ Factura" (Home, Documents tabs) say which one; other links ask first
    const params = new URLSearchParams(window.location.search);
    const doc = params.get("doc");
    if (doc === "invoice" || doc === "estimate") setDocKind(doc);
    if (params.has("client") || params.has("job")) void getJobs().then((jobs) => setClient(clientFromLink(params, jobs)));
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
      // the phone's own cleanup: less echo and room noise, steady volume (helps; the server keeps only Carlos's voice)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
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
          // iPhones record mp4, Chrome/Android webm: send it as what it really is
          const type = mediaRecorder.mimeType || "audio/webm";
          const audioBlob = new Blob(audioChunksRef.current, { type });
          const formData = new FormData();
          formData.append("file", audioBlob, type.includes("mp4") ? "audio.mp4" : "audio.webm");
          formData.append("lang", lang); // the language he speaks: ElevenLabs stops guessing

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
      // his saved and past clients: Mano recognizes the name in the note ("Atlanta Homeiker" = ATL Homemaker)
      const clients = client ? [] : groupClients(await getJobs(), loadSavedClients()).map(({ name, phone, email, address }) => ({ name, phone, email, address }));
      const job = await createJob(text.trim(), { docIntent: docKind ?? "estimate", client, clients });
      router.push(`/trabajos/${job.id}`);
    } catch (err) {
      setSubmitError(err instanceof ManoBusyError ? t.extractBusy : t.extractError);
      setBusy(false);
    }
  };

  if (busy) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-mano-dark px-8 text-center text-white">
        <Loader2 className="size-10 animate-spin text-white" />
        <p className="font-serif text-[28px] leading-8">{t.thinking}</p>
      </main>
    );
  }

  const clientChip = client && (
    <p className="mt-4 flex items-center gap-2 rounded-[14px] glass px-4 py-2.5 text-sm font-semibold text-forest">
      <UserRound className="size-4 shrink-0" strokeWidth={2.25} />
      <span className="min-w-0 flex-1 truncate">{t.forClient(client.name)}</span>
      <button type="button" onClick={() => setClient(null)} aria-label={t.close} className="-mr-1 shrink-0 p-1 text-charcoal/50">
        <X className="size-4" />
      </button>
    </p>
  );

  // Opened without a choice (jobs list "+", a client card): estimate or invoice first, nothing pre-selected
  if (!docKind)
    return (
      <Screen>
        <PageHeader backHref="/inicio" />
        <Title>{t.docKindLabel}</Title>
        {clientChip}
        <div className="mt-6 space-y-3">
          {(["estimate", "invoice"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setDocKind(k)}
              className="flex w-full items-center gap-4 rounded-[20px] glass p-5 text-left transition active:scale-[0.98]"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-forest">
                {k === "estimate" ? <FileText className="size-6 text-white" /> : <Receipt className="size-6 text-white" />}
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-bold leading-6">{k === "estimate" ? t.docEstimate : t.docInvoice}</span>
                <span className="block text-sm text-charcoal/60">{k === "estimate" ? t.estimateWhen : t.invoiceWhen}</span>
              </span>
            </button>
          ))}
        </div>
      </Screen>
    );

  return (
    <Screen>
      <PageHeader backHref="/inicio" />
      <Title>{docKind === "invoice" ? t.newInvoice : t.newEstimate}</Title>
      <p className="mt-2 text-base leading-5">{t.newJobBody}</p>

      {clientChip}

      {/* tapped the wrong one: switch before Mano organizes it */}
      <p className="mt-3 text-sm text-charcoal/60">
        {docKind === "invoice" ? t.invoiceWhen : t.estimateWhen} ·{" "}
        <button type="button" onClick={() => setDocKind(docKind === "invoice" ? "estimate" : "invoice")} className="font-semibold text-forest underline underline-offset-4">
          {docKind === "invoice" ? t.switchToEstimate : t.switchToInvoice}
        </button>
      </p>

      {/* the input area: phone = big mic, tools, text box · desktop = text box first, then the tools (small Dictar) */}
      <div className="grid [grid-template-areas:'mic'_'tools'_'text'] lg:mt-5 lg:[grid-template-areas:'text'_'tools']">
        <div className="flex flex-col [grid-area:mic] lg:hidden">
          {canListen && (
            <button
              type="button"
              onClick={toggleMic}
              disabled={transcribing}
              aria-pressed={isRecording}
              className="mt-8 flex flex-col items-center gap-3 self-center lg:hidden"
            >
              <span
                className={`flex size-[88px] items-center justify-center rounded-full transition ${
                  isRecording ? "bg-forest ring-8 ring-sage glow-sage" : "bg-forest glow-sage"
                }`}
              >
                {transcribing ? (
                  <Loader2 className="size-10 animate-spin text-forest" strokeWidth={2} />
                ) : (
                  <Mic className={`size-10 ${isRecording ? "animate-pulse text-white" : "text-white"}`} strokeWidth={2} />
                )}
              </span>
              <span className="text-sm font-semibold">
                {transcribing ? t.thinking : isRecording ? t.listening : t.tapToTalk}
              </span>
            </button>
          )}
        </div>
        <div className="flex flex-col [grid-area:tools]">

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
          {/* a note on paper → the camera; a photo he already has (note, WhatsApp screenshot) → his photos */}
          {/* desktop: typing first; these tools sit under the text box, the mic is a small button */}
          <div className="mt-4 flex justify-center gap-2 lg:mt-3 lg:justify-start">
            {canListen && (
              <button
                type="button"
                onClick={toggleMic}
                disabled={transcribing}
                aria-pressed={isRecording}
                className={`hidden h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition active:scale-[0.97] disabled:opacity-50 lg:flex ${
                  isRecording ? "bg-forest text-white" : "glass text-forest"
                }`}
              >
                {transcribing ? <Loader2 className="size-4 animate-spin" /> : <Mic className={`size-4 ${isRecording ? "animate-pulse" : ""}`} strokeWidth={2.25} />}
                {transcribing ? t.thinking : isRecording ? t.listening : t.dictate}
              </button>
            )}
            <button
              type="button"
              onClick={() => (canUseLiveCamera() ? setScanning(true) : photoInput.current?.click())}
              disabled={reading || isRecording || transcribing}
              className="flex h-11 items-center justify-center gap-2 rounded-full glass px-4 text-sm font-semibold text-forest transition active:scale-[0.97] disabled:opacity-50"
            >
              {reading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" strokeWidth={2.25} />}
              {reading ? t.scanReading : t.scanNote}
            </button>
            {!reading && (
              <button
                type="button"
                onClick={() => photoInput.current?.click()}
                disabled={isRecording || transcribing}
                className="flex h-11 items-center justify-center gap-2 rounded-full glass px-4 text-sm font-semibold text-forest transition active:scale-[0.97] disabled:opacity-50"
              >
                <ImageIcon className="size-4" strokeWidth={2.25} />
                {t.uploadNote}
              </button>
            )}
          </div>
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
              className={`mt-2 text-center text-sm font-semibold lg:text-left ${scanMessage.kind === "error" ? "text-overdue-ink" : "text-forest"}`}
            >
              {scanMessage.text}
            </p>
          )}

          {voiceError && (
            <p role="alert" className="mt-3 text-center text-sm font-semibold text-overdue-ink lg:text-left">
              {voiceError}
            </p>
          )}

        </div>
        <div className="[grid-area:text]">
          <div className="relative mt-6 lg:mt-0">
            <textarea
              value={interim ? `${text} ${interim}` : text}
              onChange={(e) => {
                textRef.current = e.target.value;
                setText(e.target.value);
              }}
              placeholder={t.newJobPlaceholder}
              rows={5}
              className="block min-h-[148px] w-full resize-none rounded-[16px] glass-field lg:min-h-[240px] px-4 py-3.5 text-base leading-6 outline-none ring-forest/60 placeholder:text-muted focus:ring-2"
            />
          </div>
        </div>
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
          <button type="button" onClick={clearAll} className={`${chip} text-overdue-ink`}>
            <Trash2 className="size-[18px]" strokeWidth={2.25} />
            {t.clearAll}
          </button>
        </div>
      )}

      {justCleared && !text && (
        <div role="status" className="mt-3 flex items-center justify-between rounded-[14px] glass-forest px-4 py-3 text-sm text-white">
          {t.cleared}
          <button type="button" onClick={undoClear} className="font-bold text-white">
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
        <p role="alert" className="mt-4 rounded-[14px] bg-overdue px-4 py-3 text-sm font-semibold text-overdue-ink">
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
        {/* no voice, no note: an empty form, line by line (like Wave) */}
        <button
          type="button"
          onClick={async () => {
            setBlanking(true);
            router.push(`/trabajos/${(await createBlankJob({ docIntent: docKind ?? "estimate", client })).id}`);
          }}
          disabled={isRecording || transcribing || blanking}
          className={`mt-1 ${btnGhost}`}
        >
          {blanking ? <Loader2 className="size-4 animate-spin" /> : <PencilLine className="size-4" strokeWidth={2.25} />}
          {t.fillMyself}
        </button>
      </div>
    </Screen>
  );
}

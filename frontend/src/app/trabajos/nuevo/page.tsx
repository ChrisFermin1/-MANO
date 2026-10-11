"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mic, RotateCcw, Sparkles, Trash2, Undo2 } from "lucide-react";
import { PageHeader, Screen, Title, btnPrimary, input } from "@/components/ui";
import { createJob, getCustomers, type Customer } from "@/lib/api";
import { DEMO_BUSINESS_ID, fetchBusiness } from "@/lib/business";
import { useLang } from "@/lib/i18n";

const chip =
  "flex h-10 items-center gap-1.5 rounded-full glass px-4 text-sm font-semibold text-forest transition active:scale-[0.97]";

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
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [jobPrice, setJobPrice] = useState("");
  const [contextError, setContextError] = useState("");
  const [businessReady, setBusinessReady] = useState(false);
  const rec = useRef<Recognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const useBrowserSpeech = useRef(false);
  const textRef = useRef("");

  useEffect(() => {
    let active = true;
    fetchBusiness().then(() => { if (active) setBusinessReady(true); })
      .catch((error: Error) => { if (active) setContextError(error.message); });
    getCustomers().then((data) => { if (active) setCustomers(data); })
      .catch((error: Error) => { if (active) setContextError(error.message); });
    return () => { active = false; };
  }, []);

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

          const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");
          const response = await fetch(`${apiBase}/api/voice/transcribe`, {
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
          console.error("Transcription failed:", err);
          const message = err instanceof Error ? err.message : "Transcription failed";
          if (getRecognition()) {
            useBrowserSpeech.current = true;
            setVoiceError(`${message}. Tap the mic again to use browser speech.`);
          } else {
            setVoiceError(message);
          }
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setVoiceError("Could not access the microphone.");
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
    if (!text.trim() || !businessReady || busy || isRecording || transcribing) return;
    setBusy(true);
    setSubmitError("");
    try {
      await createJob({
        business_id: DEMO_BUSINESS_ID,
        description: text.trim(),
        ...(customerId ? { customer_id: customerId } : customerName.trim() ? { customer_name: customerName.trim() } : {}),
        ...(jobPrice.trim() !== "" ? { job_price: jobPrice.trim() } : {}),
      });
      router.push("/inicio");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t.extractError);
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
          rows={6}
          className="w-full resize-none rounded-[20px] glass-field p-5 text-base leading-6 outline-none ring-forest/60 placeholder:text-muted focus:ring-2"
        />
      </div>

      {text && !isRecording && !transcribing && (
        <div className="mt-3 flex flex-wrap gap-2">
          {history.length > 0 && (
            <button type="button" onClick={removeLast} className={chip}>
              <Undo2 className="size-4" strokeWidth={2.25} /> {t.removeLast}
            </button>
          )}
          {canListen && (
            <button type="button" onClick={recordAgain} className={chip}>
              <RotateCcw className="size-4" strokeWidth={2.25} /> {t.recordAgain}
            </button>
          )}
          <button type="button" onClick={clearAll} className={`${chip} text-[#8a2a17]`}>
            <Trash2 className="size-4" strokeWidth={2.25} /> {t.clearAll}
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
          className="mt-2 self-start text-sm font-semibold text-forest underline underline-offset-4"
        >
          {t.tryExample}
        </button>
      )}

      <div className="mt-6 space-y-3">
        <label className="block text-sm font-semibold">
          {lang === "es" ? "Cliente (opcional)" : "Customer (optional)"}
          <select aria-label={lang === "es" ? "Cliente" : "Customer"} value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={`${input} mt-1 w-full`}>
            <option value="">{customers === null ? (lang === "es" ? "Cargando clientes…" : "Loading customers…") : (lang === "es" ? "Sin selección" : "No selection")}</option>
            {(customers ?? []).map((customer) => <option key={customer.customer_id} value={customer.customer_id}>
              {customer.customer_name || "—"}{` · ${customer.phone_number || customer.customer_id.slice(-8)}`}
            </option>)}
          </select>
        </label>
        {!customerId && <label className="block text-sm font-semibold">
          {lang === "es" ? "Nombre del cliente (opcional)" : "Customer name (optional)"}
          <input aria-label={lang === "es" ? "Nombre del cliente" : "Customer name"} value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={`${input} mt-1 w-full`} />
        </label>}
        <label className="block text-sm font-semibold">
          {lang === "es" ? "Precio del trabajo (opcional)" : "Job price (optional)"}
          <input aria-label={lang === "es" ? "Precio del trabajo" : "Job price"} inputMode="decimal" placeholder="2500.00" value={jobPrice} onChange={(e) => setJobPrice(e.target.value)} className={`${input} mt-1 w-full`} />
        </label>
      </div>

      {(contextError || submitError) && (
        <p role="alert" className="mt-4 rounded-[14px] bg-[#fff0ed] px-4 py-3 text-sm font-semibold text-[#8a2a17]">
          {[contextError, submitError].filter(Boolean).join(" · ")}
        </p>
      )}

      <div className="mt-auto pt-8">
        <button
          type="button"
          onClick={submit}
          disabled={!businessReady || !text.trim() || isRecording || transcribing}
          className={btnPrimary}
        >
          <Sparkles className="size-5" strokeWidth={2.5} />
          {t.organize}
        </button>
      </div>
    </Screen>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mic, RotateCcw, Sparkles, Trash2, Undo2 } from "lucide-react";
import { PageHeader, Screen, Title, btnPrimary } from "@/components/ui";
import { createJob } from "@/lib/api";
import { useLang } from "@/lib/i18n";

const chip =
  "flex h-10 items-center gap-1.5 rounded-full glass px-4 text-sm font-semibold text-forest transition active:scale-[0.97]";

const EXAMPLE ="Pintar la sala y cocina para Maria Lopez, dos manos, y reparar una grieta en la pared.";

// Minimal typing for the Web Speech API (not in TS's DOM lib)
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
};

function getRecognition(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function NuevoTrabajo() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const [canListen, setCanListen] = useState(false);
  const [busy, setBusy] = useState(false);
  // Snapshots of `text` before each recorded phrase / clear, so any step can be undone
  const [history, setHistory] = useState<string[]>([]);
  const [justCleared, setJustCleared] = useState(false);
  const rec = useRef<Recognition | null>(null);
  const textRef = useRef("");

  useEffect(() => setCanListen(getRecognition() !== null), []);
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    if (!justCleared) return;
    const id = setTimeout(() => setJustCleared(false), 6000);
    return () => clearTimeout(id);
  }, [justCleared]);

  const removeLast = () => {
    setText(history[history.length - 1] ?? "");
    setHistory((h) => h.slice(0, -1));
  };

  const clearAll = () => {
    const old = rec.current;
    rec.current = null;
    old?.stop();
    setListening(false);
    if (text) setHistory((h) => [...h, text]);
    textRef.current = "";
    setText("");
    setInterim("");
    setJustCleared(true);
  };

  const undoClear = () => {
    removeLast();
    setJustCleared(false);
  };

  const recordAgain = () => {
    clearAll();
    setJustCleared(false);
    startListening();
  };

  const toggleMic = () => {
    if (listening) rec.current?.stop();
    else startListening();
  };

  const startListening = () => {
    const R = getRecognition();
    if (!R) return;
    const r = new R();
    r.lang = lang === "es" ? "es-US" : "en-US";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interimText += res[0].transcript;
      }
      if (finalText) {
        const prev = textRef.current;
        const next = `${prev}${prev && !prev.endsWith(" ") ? " " : ""}${finalText.trim()}`;
        textRef.current = next;
        setHistory((h) => [...h, prev]);
        setText(next);
      }
      setInterim(interimText);
    };
    r.onend = () => {
      if (rec.current !== r) return; // an older session ending after "Grabar de nuevo"
      setListening(false);
      setInterim("");
    };
    rec.current = r;
    r.start();
    setListening(true);
  };

  const submit = async () => {
    rec.current?.stop();
    setBusy(true);
    const job = await createJob(text.trim());
    router.push(`/trabajos/${job.id}`);
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
          aria-pressed={listening}
          className="mt-8 flex flex-col items-center gap-3 self-center"
        >
          <span
            className={`flex size-[88px] items-center justify-center rounded-full transition ${
              listening ? "bg-forest ring-8 ring-lime/40 glow-lime" : "bg-lime glow-lime"
            }`}
          >
            <Mic className={`size-10 ${listening ? "animate-pulse text-lime" : "text-forest"}`} strokeWidth={2} />
          </span>
          <span className="text-sm font-semibold">{listening ? t.listening : t.tapToTalk}</span>
        </button>
      )}

      <div className="relative mt-6">
        <textarea
          value={interim ? `${text} ${interim}` : text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.newJobPlaceholder}
          rows={6}
          className="w-full resize-none rounded-[20px] glass-field p-5 text-base leading-6 outline-none ring-forest/60 placeholder:text-muted focus:ring-2"
        />
      </div>

      {text && !listening && (
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
            setHistory((h) => [...h, text]);
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

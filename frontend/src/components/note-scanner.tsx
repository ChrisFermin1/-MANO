"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Image as ImageIcon, X } from "lucide-react";
import { findPaper, flattenPaper, sameQuad, type Quad } from "@/lib/doc-scan";
import { useLang } from "@/lib/i18n";

const DETECT_WIDTH = 240; // small copy of the frame for finding the paper (fast on phones)
const STEADY_FRAMES = 7; // ≈1 second holding still → capture by itself
const FRAME_MS = 140;

/** Live camera is only allowed on https (or localhost). Otherwise "Escanear una nota" uses the photo picker. */
export const canUseLiveCamera = () =>
  typeof window !== "undefined" && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia;

/**
 * Full-screen camera for "Escanear una nota": a green outline follows the paper; holding still for about
 * a second takes the photo (or tap the shutter). The paper is cut out, straightened and cleaned up first.
 */
export function NoteScanner({
  onCapture,
  onClose,
  onPickPhoto,
}: {
  onCapture: (photo: File) => void;
  onClose: () => void;
  onPickPhoto: () => void; // fallback: choose an existing photo instead
}) {
  const { t } = useLang();
  const video = useRef<HTMLVideoElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const small = useRef<HTMLCanvasElement | null>(null);
  const quad = useRef<Quad | null>(null);
  const steady = useRef(0);
  const done = useRef(false);
  const [state, setState] = useState<"starting" | "searching" | "found" | "hold" | "denied">("starting");

  const capture = useCallback(async () => {
    const v = video.current;
    if (!v || done.current || !v.videoWidth) return;
    done.current = true;
    const full = document.createElement("canvas");
    full.width = v.videoWidth;
    full.height = v.videoHeight;
    const ctx = full.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(v, 0, 0);
    let out: HTMLCanvasElement = full;
    const q = quad.current;
    if (q) {
      // the outline was found on the small copy: scale its corners up to the full photo
      const s = v.videoWidth / DETECT_WIDTH;
      const flat = flattenPaper(ctx.getImageData(0, 0, full.width, full.height), q.map((p) => ({ x: p.x * s, y: p.y * s })) as Quad);
      out = document.createElement("canvas");
      out.width = flat.width;
      out.height = flat.height;
      out.getContext("2d")!.putImageData(flat, 0, 0);
    }
    const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/jpeg", 0.88));
    if (blob) onCapture(new File([blob], "nota.jpg", { type: "image/jpeg" }));
  }, [onCapture]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
      } catch {
        if (!cancelled) setState("denied");
        return;
      }
      if (cancelled) return stream.getTracks().forEach((track) => track.stop());
      const v = video.current!;
      v.srcObject = stream;
      await v.play().catch(() => {});
      setState("searching");

      small.current = document.createElement("canvas");
      timer = setInterval(() => {
        if (done.current || !v.videoWidth) return;
        const sc = small.current!;
        sc.width = DETECT_WIDTH;
        sc.height = Math.round((v.videoHeight / v.videoWidth) * DETECT_WIDTH);
        const sctx = sc.getContext("2d", { willReadFrequently: true })!;
        sctx.drawImage(v, 0, 0, sc.width, sc.height);
        const found = findPaper(sctx.getImageData(0, 0, sc.width, sc.height));
        const still = sameQuad(found, quad.current, Math.hypot(sc.width, sc.height));
        steady.current = found && still ? steady.current + 1 : 0;
        quad.current = found;
        setState(!found ? "searching" : steady.current >= 3 ? "hold" : "found");
        drawOutline(overlay.current, v, found, sc.width);
        if (steady.current >= STEADY_FRAMES) void capture();
      }, FRAME_MS);
    })();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [capture]);

  const hint =
    state === "denied" ? t.scanCameraDenied : state === "hold" ? t.scanHold : state === "found" ? t.scanFound : t.scanAim;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label={t.scanNote}>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <video ref={video} playsInline muted className="absolute inset-0 size-full object-cover" />
        <canvas ref={overlay} className="pointer-events-none absolute inset-0 size-full" aria-hidden />
        <button
          type="button"
          onClick={onClose}
          aria-label={t.close}
          className="absolute left-4 top-[max(16px,env(safe-area-inset-top))] flex size-11 items-center justify-center rounded-full bg-black/45 backdrop-blur"
        >
          <X className="size-6" />
        </button>
        <p
          role="status"
          className="absolute inset-x-4 top-[max(72px,calc(env(safe-area-inset-top)+56px))] mx-auto w-fit max-w-full rounded-full bg-black/55 px-4 py-2 text-center text-sm font-semibold backdrop-blur"
        >
          {hint}
        </p>
      </div>

      <div className="flex items-center justify-between px-8 pb-[max(24px,env(safe-area-inset-bottom))] pt-5">
        <button type="button" onClick={onPickPhoto} className="flex w-16 flex-col items-center gap-1 text-xs font-semibold text-white/85">
          <ImageIcon className="size-6" /> {t.scanPickPhoto}
        </button>
        <button
          type="button"
          onClick={() => void capture()}
          disabled={state === "starting" || state === "denied"}
          aria-label={t.scanShutter}
          className="flex size-[72px] items-center justify-center rounded-full border-4 border-white/90 transition active:scale-95 disabled:opacity-40"
        >
          <span className={`size-[56px] rounded-full ${state === "hold" ? "bg-lime" : "bg-white"}`} />
        </button>
        <span className="w-16" aria-hidden />
      </div>
    </div>
  );
}

/** Draw the paper's outline over the video (the video is shown "cover"-scaled, so map coordinates the same way). */
function drawOutline(canvas: HTMLCanvasElement | null, v: HTMLVideoElement, q: Quad | null, detectWidth: number) {
  if (!canvas) return;
  const cw = (canvas.width = canvas.clientWidth * devicePixelRatio);
  const ch = (canvas.height = canvas.clientHeight * devicePixelRatio);
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, cw, ch);
  if (!q) return;
  const scale = Math.max(cw / v.videoWidth, ch / v.videoHeight);
  const ox = (cw - v.videoWidth * scale) / 2, oy = (ch - v.videoHeight * scale) / 2;
  const s = (v.videoWidth / detectWidth) * scale;
  ctx.beginPath();
  q.forEach((p, i) => (i ? ctx.lineTo(ox + p.x * s, oy + p.y * s) : ctx.moveTo(ox + p.x * s, oy + p.y * s)));
  ctx.closePath();
  ctx.fillStyle = "rgba(166, 217, 59, 0.18)";
  ctx.fill();
  ctx.lineWidth = 4 * devicePixelRatio;
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#a6d93b";
  ctx.stroke();
}

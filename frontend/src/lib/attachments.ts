// Photos and files on a job: site photos, designs, material choices, before/after, receipts, contracts.
// Each one has a caption (Carlos writes Spanish, the client reads English) and can be "Solo para mí".
// Saved in the browser's IndexedDB (photos are too big for localStorage), shrunk first so they stay light.
// Real version: uploaded to file storage by Josh's backend (POST /jobs/:id/files), same fields.

import { toEnglish } from "@/lib/translate";

export type Attachment = {
  id: string;
  jobId: number;
  kind: "image" | "pdf";
  name: string;
  mime: string;
  blob: Blob;
  caption: string;
  captionEn: string | null; // what the client reads; null = show the original
  private: boolean; // "Solo para mí": never on the client's link or PDF
  createdAt: string;
};

/** What the client's link and PDF get: no private files, the file itself as a data URL. */
export type PublicAttachment = { id: string; kind: "image" | "pdf"; name: string; url: string; caption: string; captionEn: string | null };

export const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_SIDE = 1600; // px: sharp on any phone, ~200–400 KB as JPEG
const DB = "mano-files";
const STORE = "files";
const EVENT = "mano:files";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" }).createIndex("jobId", "jobId");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = run(t.objectStore(STORE));
    // close every time: an open connection blocks deleteDatabase ("Borrar mi cuenta" would keep the photos)
    t.oncomplete = () => (db.close(), resolve(req ? req.result : undefined));
    t.onerror = () => (db.close(), reject(t.error));
    t.onabort = () => (db.close(), reject(t.error));
  });
}

const changed = (jobId: number) => window.dispatchEvent(new CustomEvent(EVENT, { detail: { jobId } }));

export async function listFiles(jobId: number): Promise<Attachment[]> {
  try {
    const all = (await tx<Attachment[]>("readonly", (s) => s.index("jobId").getAll(jobId))) ?? [];
    return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch {
    return [];
  }
}

export function onFilesChange(jobId: number, fn: () => void): () => void {
  const h = (e: Event) => (e as CustomEvent<{ jobId: number }>).detail.jobId === jobId && fn();
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}

/** Phone photos are 3–12 MB; a 1600px JPEG looks the same on a screen or a printed page. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((r) => canvas.toBlob((b) => r(b ?? file), "image/jpeg", 0.82));
}

/** Adds photos / PDFs. Anything else (or a PDF over 10 MB) is skipped and returned in `skipped`. */
export async function addFiles(jobId: number, files: File[]): Promise<{ added: Attachment[]; skipped: File[] }> {
  const added: Attachment[] = [];
  const skipped: File[] = [];
  for (const f of files) {
    const isImage = f.type.startsWith("image/");
    const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    if (!isImage && !(isPdf && f.size <= MAX_PDF_BYTES)) {
      skipped.push(f);
      continue;
    }
    const blob = isImage ? await shrink(f) : f;
    added.push({
      id: crypto.randomUUID(),
      jobId,
      kind: isImage ? "image" : "pdf",
      name: f.name,
      mime: isImage ? "image/jpeg" : "application/pdf",
      blob,
      caption: "",
      captionEn: null,
      private: false,
      createdAt: new Date().toISOString(),
    });
  }
  if (added.length) {
    await tx("readwrite", (s) => void added.forEach((a) => s.put(a)));
    changed(jobId);
  }
  return { added, skipped };
}

export async function updateFile(a: Attachment, patch: Partial<Pick<Attachment, "caption" | "captionEn" | "private">>): Promise<Attachment> {
  const next = { ...a, ...patch };
  await tx("readwrite", (s) => s.put(next));
  changed(a.jobId);
  return next;
}

export async function removeFile(a: Attachment) {
  await tx("readwrite", (s) => s.delete(a.id));
  changed(a.jobId);
}

/** Spanish caption → English for the client. Common words locally, anything else through Mano (Gemini). */
export async function captionToEnglish(es: string): Promise<string | null> {
  const text = es.trim();
  if (!text) return null;
  const quick = toEnglish(text);
  if (quick) return quick;
  try {
    const r = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    if (!r.ok) return null;
    const { en } = (await r.json()) as { en?: string };
    return en?.trim() || null;
  } catch {
    return null;
  }
}

const toDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

/** The files the client is allowed to see, ready for the link and the PDF. */
export async function publicFiles(jobId: number): Promise<PublicAttachment[]> {
  const files = (await listFiles(jobId)).filter((a) => !a.private);
  return Promise.all(
    files.map(async (a) => ({ id: a.id, kind: a.kind, name: a.name, url: await toDataUrl(a.blob), caption: a.caption, captionEn: a.captionEn })),
  );
}

/** DEMO relay: copies the client-visible files next to the estimate so a phone on the Wi-Fi can see them. */
export async function publishFiles(jobId: number, token: string | null | undefined) {
  if (!token) return;
  try {
    const files = await publicFiles(jobId);
    await fetch(`/api/demo/files/${encodeURIComponent(token)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ files }) });
  } catch {}
}

export async function fetchPublicFiles(token: string): Promise<PublicAttachment[]> {
  try {
    const r = await fetch(`/api/demo/files/${encodeURIComponent(token)}`, { cache: "no-store" });
    return r.ok ? ((await r.json()) as { files: PublicAttachment[] }).files : [];
  } catch {
    return [];
  }
}

/** "Borrar mi cuenta": the photos go too. */
export function deleteAllFiles() {
  try {
    indexedDB.deleteDatabase(DB);
  } catch {}
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Loader2, Lock, Plus, Trash2 } from "lucide-react";
import { Sheet, btnSecondary, input } from "@/components/ui";
import { UpgradeCard } from "@/components/upgrade-card";
import type { Job } from "@/lib/api";
import { addFiles, captionToEnglish, listFiles, onFilesChange, publishFiles, removeFile, updateFile, type Attachment } from "@/lib/attachments";
import { useLang } from "@/lib/i18n";
import { getPlan, onPlanChange, type PlanInfo } from "@/lib/plan";

// Photos and files on a job. Hardscape: the yard today, the design, the paver they picked. Painting: before /
// after. Anyone: receipts, contracts. The client sees them on their link and PDF unless marked "Solo para mí".
export function JobFiles({ job }: { job: Job }) {
  const { t } = useLang();
  const [files, setFiles] = useState<Attachment[] | null>(null);
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [skipped, setSkipped] = useState(0);
  const [blocked, setBlocked] = useState(false); // tried to add more than Free allows
  const [open, setOpen] = useState<Attachment | null>(null);
  const picker = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = () => void listFiles(job.id).then(setFiles);
    load();
    setPlan(getPlan());
    const offFiles = onFilesChange(job.id, load);
    const offPlan = onPlanChange(() => setPlan(getPlan()));
    return () => {
      offFiles();
      offPlan();
    };
  }, [job.id]);

  // thumbnails: one object URL per file, released when the list changes
  const urls = useMemo(() => new Map((files ?? []).map((f) => [f.id, URL.createObjectURL(f.blob)])), [files]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  if (!files || !plan) return null;
  const photos = files.filter((f) => f.kind === "image").length;
  const roomForPhotos = plan.photosPerJob - photos;
  const limited = Number.isFinite(plan.photosPerJob);

  const add = async (list: FileList | null) => {
    if (!list?.length) return;
    const picked = Array.from(list);
    const images = picked.filter((f) => f.type.startsWith("image/"));
    const pdfs = picked.filter((f) => !f.type.startsWith("image/"));
    // Free: only the photos that still fit, no PDFs; the rest shows the upgrade card
    const allowed = [...images.slice(0, Math.max(0, roomForPhotos)), ...(plan.files ? pdfs : [])];
    setBlocked(allowed.length < picked.length);
    setBusy(true);
    const { skipped: bad } = await addFiles(job.id, allowed);
    setSkipped(bad.length);
    setBusy(false);
    void publishFiles(job.id, job.public_token);
  };

  return (
    <section className="mt-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold">{t.filesTitle}</h2>
        {limited && photos > 0 && <span className="text-xs text-muted">{t.photosUsed(photos, plan.photosPerJob)}</span>}
      </div>
      {files.length === 0 && <p className="mt-1 text-sm leading-5 text-muted">{t.filesHint}</p>}

      <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        {files.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => setOpen(f)}
              className="group relative block aspect-square w-full overflow-hidden rounded-[14px] bg-white ring-1 ring-black/5 outline-none focus-visible:ring-2 focus-visible:ring-forest"
            >
              {f.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element -- a local blob, not a site image
                <img src={urls.get(f.id)} alt={f.caption || f.name} className="size-full object-cover" />
              ) : (
                <span className="flex size-full flex-col items-center justify-center gap-1 p-2 text-forest">
                  <FileText className="size-7" strokeWidth={1.75} />
                  <span className="w-full truncate text-center text-[11px] font-semibold">{f.name}</span>
                </span>
              )}
              {f.private && (
                <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-charcoal/75 px-2 py-0.5 text-[10px] font-bold text-white">
                  <Lock className="size-3" strokeWidth={2.5} /> {t.privateTag}
                </span>
              )}
              {f.caption && (
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 to-transparent px-2 pb-1.5 pt-4 text-left text-[11px] font-semibold text-white">
                  {f.caption}
                </span>
              )}
            </button>
          </li>
        ))}
        {(roomForPhotos > 0 || plan.files) && (
          <li>
            <button
              type="button"
              onClick={() => picker.current?.click()}
              disabled={busy}
              className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-[14px] border-2 border-dashed border-forest/25 text-sm font-semibold text-forest transition hover:bg-white/60 active:scale-[0.98] disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-6 animate-spin" /> : <Plus className="size-6" strokeWidth={2.25} />}
              {t.addFiles}
            </button>
          </li>
        )}
      </ul>
      <input
        ref={picker}
        type="file"
        multiple
        accept={plan.files ? "image/*,application/pdf" : "image/*"}
        className="hidden"
        onChange={(e) => {
          void add(e.target.files);
          e.target.value = ""; // picking the same photo again still fires
        }}
      />

      {skipped > 0 && <p className="mt-2 text-sm font-semibold text-ojo-ink">{t.filesSkipped(skipped)}</p>}
      {(blocked || (limited && roomForPhotos <= 0)) && (
        <div className="mt-3">
          <UpgradeCard title={t.upgradeFilesTitle} body={t.upgradeFilesBody} from="files" />
        </div>
      )}

      {open && <FileSheet file={open} url={urls.get(open.id)} job={job} onClose={() => setOpen(null)} />}
    </section>
  );
}

function FileSheet({ file, url, job, onClose }: { file: Attachment; url?: string; job: Job; onClose: () => void }) {
  const { t } = useLang();
  const [a, setA] = useState(file);
  const [caption, setCaption] = useState(file.caption);
  const [saving, setSaving] = useState(false);

  const latest = useRef(file); // the newest saved version (the English arrives after the Spanish)
  const save = async (patch: Partial<Pick<Attachment, "caption" | "captionEn" | "private">>) => {
    const next = await updateFile(latest.current, patch);
    latest.current = next;
    setA(next);
    void publishFiles(job.id, job.public_token);
  };
  // the caption saves right away; the English for the client follows when it's ready
  const saveCaption = async () => {
    const text = caption.trim();
    if (text === latest.current.caption) return;
    await save({ caption: text, captionEn: null });
    if (!text) return;
    setSaving(true);
    const en = await captionToEnglish(text);
    setSaving(false);
    if (en && latest.current.caption === text) await save({ captionEn: en });
  };

  return (
    <Sheet open onClose={onClose} title={a.kind === "image" ? t.photoTitle : t.fileTitle}>
      <div className="mt-4 space-y-4">
        {a.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local blob
          <img src={url} alt={a.caption || a.name} className="max-h-[40vh] w-full rounded-[14px] bg-black/5 object-contain" />
        ) : (
          <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-[14px] bg-white p-4 text-forest ring-1 ring-black/5">
            <FileText className="size-6 shrink-0" strokeWidth={1.75} />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{a.name}</span>
            <span className="text-sm font-bold">{t.openFile}</span>
          </a>
        )}

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">{t.fileCaption}</span>
          <input
            className={input}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onBlur={() => void saveCaption()}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            placeholder={t.captionPlaceholder}
            maxLength={120}
          />
          {saving ? (
            <span className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
              <Loader2 className="size-3 animate-spin" /> {t.translating}
            </span>
          ) : (
            a.captionEn && a.captionEn !== a.caption && !a.private && <span className="mt-1.5 block text-xs text-muted">{t.captionClientSees(a.captionEn)}</span>
          )}
        </label>

        <button type="button" role="switch" aria-checked={a.private} onClick={() => void save({ private: !a.private })} className="flex w-full items-center gap-3 text-left">
          <Lock className="size-5 shrink-0 text-charcoal/60" strokeWidth={2} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{t.onlyForMe}</span>
            <span className="block text-xs text-muted">{t.onlyForMeHint}</span>
          </span>
          <span className={`flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition ${a.private ? "bg-forest" : "bg-black/15"}`}>
            <span className={`size-6 rounded-full bg-white shadow transition ${a.private ? "translate-x-5" : ""}`} />
          </span>
        </button>

        <button
          type="button"
          onClick={async () => {
            await removeFile(a);
            void publishFiles(job.id, job.public_token);
            onClose();
          }}
          className={`${btnSecondary} border-overdue-ink/30! text-overdue-ink!`}
        >
          <Trash2 className="size-5" strokeWidth={2} /> {t.deleteFile}
        </button>
      </div>
    </Sheet>
  );
}

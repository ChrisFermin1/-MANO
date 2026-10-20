"use client";

import { useLang, type Lang } from "@/lib/i18n";

// dark: on dark/photo backgrounds · light: on cream pages (Welcome, Tu negocio) · compact: the website's top bar
export function LangToggle({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  const { lang, setLang } = useLang();
  const options: Lang[] = ["es", "en"];

  return (
    <div className={`${light ? "glass" : "glass-dark"} flex ${compact ? "h-8" : "h-[35px]"} rounded-full p-0`} role="group" aria-label="Idioma / Language">
      {options.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          lang={l}
          aria-label={l === "es" ? "Español" : "English"}
          className={`h-full ${compact ? "w-11 text-[13px]" : "w-[52px] text-sm"} rounded-full font-medium uppercase outline-none transition-colors focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-1 ${
            lang === l ? (light ? "bg-forest text-white" : "bg-white text-charcoal shadow-sm") : light ? "text-charcoal/60" : "text-white/85"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

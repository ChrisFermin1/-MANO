"use client";

import { useLang, type Lang } from "@/lib/i18n";

// dark: on the Welcome photo · light: on cream pages (Tu negocio)
export function LangToggle({ light = false }: { light?: boolean }) {
  const { lang, setLang } = useLang();
  const options: Lang[] = ["es", "en"];

  return (
    <div className={`${light ? "glass" : "glass-dark"} flex h-[35px] rounded-full p-0`} role="group" aria-label="Idioma / Language">
      {options.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`h-full w-[52px] rounded-full text-sm font-medium uppercase transition-colors ${
            lang === l ? (light ? "bg-forest text-lime" : "bg-white text-black shadow-sm") : light ? "text-black/60" : "text-white/85"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

"use client";

import { useLang, type Lang } from "@/lib/i18n";

export function LangToggle() {
  const { lang, setLang } = useLang();
  const options: Lang[] = ["es", "en"];

  return (
    <div className="glass-dark flex h-[35px] rounded-full p-0" role="group" aria-label="Idioma / Language">
      {options.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`h-full w-[52px] rounded-full text-sm font-medium uppercase transition-colors ${
            lang === l ? "bg-white text-black shadow-sm" : "text-white/85"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

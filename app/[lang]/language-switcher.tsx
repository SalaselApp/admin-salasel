"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { locales, type Locale } from "@/lib/i18n/config";

/**
 * Header language switcher. Swaps the leading `[lang]` URL segment so the
 * user stays on the same page in the new locale (matches the public
 * Salasel app's LanguageSwitcher). The dropdown anchors to the correct
 * side based on text direction.
 */
export function LanguageSwitcher({
  currentLocale,
  label,
}: {
  currentLocale: Locale;
  label: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current =
    locales.find((l) => l.code === currentLocale) ?? locales[0];

  function handleSwitch(code: Locale) {
    setOpen(false);
    if (code === currentLocale) return;
    const segments = pathname.split("/");
    // segments[0] is "" (leading slash), segments[1] is the locale.
    segments[1] = code;
    router.push(segments.join("/") || "/");
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
      >
        <span className="material-icons-round text-base">language</span>
        <span>{current.name}</span>
        <span
          className={`material-icons-round text-base transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          expand_more
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={label}
          className="absolute end-0 top-full z-50 mt-1.5 w-max min-w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800"
        >
          {locales.map((l) => {
            const isActive = l.code === currentLocale;
            return (
              <li key={l.code} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onClick={() => handleSwitch(l.code)}
                  className={`w-full px-4 py-2 text-start text-sm transition-colors focus:outline-none ${
                    isActive
                      ? "cursor-default bg-primary/10 font-medium text-primary"
                      : "cursor-pointer text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                  }`}
                >
                  {l.name}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

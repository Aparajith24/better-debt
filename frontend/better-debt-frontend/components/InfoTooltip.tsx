"use client";

import { useEffect, useRef, useState } from "react";

// Small "i" icon that reveals a plain-language explanation on click — for
// form fields whose label alone isn't self-explanatory (jargon like "APR" or
// "teaser rate").
export function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="More info"
        aria-expanded={open}
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-current text-[10px] font-medium opacity-60 hover:opacity-100"
      >
        i
      </button>
      {open && (
        <span className="absolute bottom-full left-1/2 z-10 mb-2 w-56 -translate-x-1/2 rounded-lg border border-zinc-200 bg-white p-2.5 text-xs leading-snug font-normal text-zinc-600 shadow-md dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {text}
        </span>
      )}
    </span>
  );
}

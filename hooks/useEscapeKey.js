"use client";

import { useEffect, useRef } from "react";

/* Calls `onEscape` when Escape is pressed while `active` is true — the
   keyboard way out of a modal. The latest callback is kept in a ref so callers
   can pass an inline function without re-subscribing every render. */
export function useEscapeKey(active, onEscape) {
  const handlerRef = useRef(onEscape);
  handlerRef.current = onEscape;

  useEffect(() => {
    if (!active) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") handlerRef.current?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active]);
}

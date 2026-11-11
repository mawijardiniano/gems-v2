"use client";

import { useCallback, useEffect, useState } from "react";

import {
  TEXT_SCALE_PRESETS,
  applyTextScaleTo,
  readStoredTextScale,
  resolveTextScale,
  writeStoredTextScale,
} from "@/lib/textScale";

/**
 * App-wide text-size preference.
 *
 * Sets the root (`<html>`) font size, which is the only place Tailwind's
 * rem-based utilities resolve against — `text-sm`, `h-16`, `w-80`, `mt-16` all
 * scale together, so the chrome and the page stay in step.
 *
 * The landing page and login are unaffected because this hook is only mounted
 * by the seven authenticated role shells (via `DashboardNavbar`), which those
 * routes never render. `<html>` is restored to its original value on unmount.
 */
export default function useTextScale() {
  const [scaleId, setScaleId] = useState(() =>
    resolveTextScale(readStoredTextScale()).id,
  );

  const scale = resolveTextScale(scaleId);

  useEffect(() => {
    writeStoredTextScale(scale.id);

    if (typeof document === "undefined") return;
    const root = document.documentElement;

    /* Only `<html>` changes. Tailwind's spacing/sizing utilities are
       `calc(var(--spacing) * n)` where `--spacing` is `0.25rem`, so raising the
       root size scales layout and type together instead of overflowing. */
    const previous = applyTextScaleTo(root, scale.id);

    return () => {
      root.style.fontSize = previous;
    };
  }, [scale.id]);

  const selectScale = useCallback((id) => {
    setScaleId(resolveTextScale(id).id);
  }, []);

  return {
    scaleId: scale.id,
    percent: scale.percent,
    label: scale.label,
    presets: TEXT_SCALE_PRESETS,
    setScaleId: selectScale,
  };
}


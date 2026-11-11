"use client";

import { useEffect, useRef, useState } from "react";
import { FaCheck, FaTextHeight } from "react-icons/fa";

import { textScaleTriggerLabel } from "@/lib/textScale";

/**
 * App-wide text-size control: Standard 100% / Large 112.5% / Larger 125% /
 * Largest 150%.
 *
 * Purely presentational — `DashboardNavbar` owns `useTextScale()` and passes
 * the state down, so only one component ever writes `<html>`'s font size.
 *
 * Follows the same interaction pattern as the account menu in
 * `components/layout/DashboardNavbar.jsx`: pointerdown-outside close,
 * Escape closes and returns focus, menu semantics with radio items.
 */
export default function TextSizeMenu({ scaleId, percent, presets, onSelect }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
        aria-label="Text size"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Text size"
      >
        <FaTextHeight size={16} aria-hidden="true" />
        <span className="hidden text-[11px] font-semibold tabular-nums sm:inline">
          {textScaleTriggerLabel(percent)}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Text size"
          className="fixed right-4 mt-2 w-56 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl animate-dropdown sm:absolute sm:right-0"
        >
          <div className="border-b border-gray-50 px-4 pb-2 pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
              Text size
            </p>
          </div>

          <div className="py-1.5">
            {presets.map((preset) => {
              const active = preset.id === scaleId;
              return (
                <button
                  key={preset.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    onSelect(preset.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors ${
                    active
                      ? "bg-secondary-50 font-semibold text-secondary-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span>{preset.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs tabular-nums opacity-70">
                      {textScaleTriggerLabel(preset.percent)}
                    </span>
                    {active && (
                      <FaCheck
                        size={11}
                        className="text-secondary-600"
                        aria-hidden="true"
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

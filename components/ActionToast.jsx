"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* Result of an admin action (reset password, activate, delete...). These
   actions used to report nothing: a refusal from the server ("you cannot
   deactivate your own account", "last active Admin") only reached the
   console, and a success looked the same as a failure. */

/** Message text from an axios/fetch error, preferring the server's reason. */
export function errorText(err, fallback = "Something went wrong. Please try again.") {
  const data = err?.response?.data;
  return data?.message || data?.error || err?.message || fallback;
}

export function useActionToast(ms = 4000) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const show = useCallback(
    (message, type = "success") => {
      clearTimeout(timer.current);
      setToast({ message, type });
      timer.current = setTimeout(() => setToast(null), ms);
    },
    [ms],
  );
  useEffect(() => () => clearTimeout(timer.current), []);
  return { toast, show, hide: () => setToast(null) };
}

const STYLES = {
  success: "bg-success-subtle text-success ring-success-solid/20",
  error: "bg-danger-subtle text-danger ring-danger-solid/20",
  info: "bg-warning-subtle text-warning ring-warning-solid/20",
};

export default function ActionToast({ toast, onClose }) {
  if (!toast) return null;
  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      className={`fixed bottom-4 right-4 z-[60] flex max-w-sm items-start gap-3 rounded-lg px-4 py-3 text-sm shadow-lg ring-1 ${
        STYLES[toast.type] || STYLES.info
      }`}
    >
      <span className="flex-1">{toast.message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        className="touch-target text-current opacity-60 hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}

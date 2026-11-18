"use client";

import QRCode from "qrcode";
import { useCallback, useEffect, useState } from "react";

/* The base URL guests reach the app on. A QR-specific override wins so a
   LAN address can be printed while the app itself is served elsewhere.
   Only NEXT_PUBLIC_ variables reach the browser (a NEXT_QR_BASE_URL fallback
   here was always undefined). */
function resolveBaseUrl() {
  const picked =
    process.env.NEXT_PUBLIC_QR_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL;
  if (picked) return picked.replace(/\/$/, "");
  return typeof window !== "undefined" ? window.location.origin : "";
}

/* The attendance QR: guests scan it and land on /attend/<id> with no login. */
export function useAttendanceQr(eventId) {
  const [baseUrl, setBaseUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");

  /* Resolved after mount: `window` does not exist during server rendering. */
  useEffect(() => {
    setBaseUrl(resolveBaseUrl());
  }, []);

  useEffect(() => {
    if (!baseUrl || !eventId) return undefined;
    let cancelled = false;
    QRCode.toDataURL(`${baseUrl}/attend/${eventId}`, { width: 220 })
      .then((dataUrl) => !cancelled && setQrDataUrl(dataUrl))
      .catch(() => !cancelled && setQrDataUrl(""));
    return () => {
      cancelled = true;
    };
  }, [baseUrl, eventId]);

  const download = useCallback(
    (title) => {
      if (!qrDataUrl) return;
      const link = document.createElement("a");
      link.href = qrDataUrl;
      link.download = `${title || "event"}-attendance-qr.png`;
      link.click();
    },
    [qrDataUrl],
  );

  return { baseUrl, qrDataUrl, download };
}

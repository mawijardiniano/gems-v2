"use client";

import { useState } from "react";
import {
  FiCheck,
  FiCopy,
  FiDownload,
  FiExternalLink,
} from "react-icons/fi";
import { FaClipboardCheck, FaSpinner } from "react-icons/fa";

/* Attendance QR — single QR: scan → no-login form → recorded as pending. */
export default function AttendanceQrCard({
  attendanceUrl,
  attendanceQrDataUrl,
  onDownload,
}) {
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyAttendanceLink = async () => {
    if (!attendanceUrl) return;
    try {
      await navigator.clipboard.writeText(attendanceUrl);
    } catch (err) {
      /* LAN IP over plain http is not a secure context, so the async
         Clipboard API is unavailable — fall back to the legacy copy. */
      const textarea = document.createElement("textarea");
      textarea.value = attendanceUrl;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
      } catch (fallbackErr) {
        console.error("Copy failed:", fallbackErr);
      }
      document.body.removeChild(textarea);
    }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="rounded-xl border border-emerald-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <FaClipboardCheck size={18} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Attendance QR
              </h3>
              <p className="mt-0.5 text-sm text-gray-500">
                Guests scan, fill the form, recorded as pending — validate to
                include in attendance
              </p>
            </div>
          </div>
          <button
            onClick={onDownload}
            disabled={!attendanceQrDataUrl}
            className="btn-success !py-2 !px-4 !rounded-lg !text-xs shrink-0"
          >
            <FiDownload size={13} />
            Download
          </button>
        </div>
        {attendanceQrDataUrl ? (
          <div className="flex items-center gap-6 flex-wrap">
            <div className="border border-emerald-100 rounded-xl p-3 bg-white shadow-sm shrink-0">
              <img
                src={attendanceQrDataUrl}
                alt="Attendance QR code"
                className="w-36 h-36"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">
                Scan Destination
              </p>
              <p className="break-all text-xs text-gray-500 bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100 font-mono">
                {attendanceUrl}
              </p>
              <p className="text-xs text-emerald-600 font-medium mt-2">
                → Opens the attendance form — no login needed
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyAttendanceLink}
                  disabled={!attendanceUrl}
                  className="btn-secondary !py-2 !px-3 !text-xs !rounded-lg"
                >
                  {linkCopied ? (
                    <>
                      <FiCheck size={13} className="text-emerald-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <FiCopy size={13} />
                      Copy Link
                    </>
                  )}
                </button>
                <a
                  href={attendanceUrl || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!attendanceUrl}
                  className={`btn-secondary !py-2 !px-3 !text-xs !rounded-lg ${
                    attendanceUrl ? "" : "pointer-events-none opacity-50"
                  }`}
                >
                  <FiExternalLink size={13} />
                  Open Link
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <FaSpinner className="animate-spin text-emerald-500" />
            Generating QR...
          </div>
        )}
      </div>
    </div>
  );
}

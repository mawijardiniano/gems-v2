"use client";

import React, { useState } from "react";
import { FaArrowLeft, FaFileAlt, FaQrcode } from "react-icons/fa";
import Modal from "@/components/ui/Modal";
import AttendanceQrCard from "../../../events-list/[id]/components/overview/AttendanceQrCard";
import { handleDownloadBlankGuestsPdf } from "../../../events-list/[id]/components/PrintUtils";
import { useAttendanceQr } from "../../../events-list/[id]/hooks/useAttendanceQr";

function OptionButton({ icon: Icon, title, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-start gap-3 rounded-xl border border-line-subtle bg-white p-4 hover:border-secondary-300 hover:bg-secondary-50/40 transition-colors"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary-50 text-secondary-600">
        <Icon size={16} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-fg">{title}</span>
        <span className="block text-xs text-fg-muted mt-0.5">{description}</span>
      </span>
    </button>
  );
}

/* Attendance for one linked event, picked by how it is taken: the online QR
   form (the same QR as the event page) or a blank sheet printed for signing.
   Mounted only while open, so the QR is generated on demand. */
export default function EventAttendanceModal({ event, onClose }) {
  const [mode, setMode] = useState(null);
  const [error, setError] = useState("");
  const qr = useAttendanceQr(event?._id);
  const attendanceUrl = qr.baseUrl ? `${qr.baseUrl}/attend/${event?._id}` : "";

  const downloadBlankSheet = () => {
    setError("");
    handleDownloadBlankGuestsPdf(event, setError);
  };

  return (
    <Modal
      open
      onClose={onClose}
      size={mode === "qr" ? "lg" : "md"}
      title="Attendance"
      description={event?.title || "Untitled event"}
    >
      {mode === "qr" ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setMode(null)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted hover:text-fg-3"
          >
            <FaArrowLeft size={10} />
            Back
          </button>
          <AttendanceQrCard
            attendanceUrl={attendanceUrl}
            attendanceQrDataUrl={qr.qrDataUrl}
            onDownload={() => qr.download(event?.title)}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <OptionButton
            icon={FaQrcode}
            title="QR online form"
            description="Show the attendance QR. Guests scan it and fill the form, no login needed."
            onClick={() => setMode("qr")}
          />
          <OptionButton
            icon={FaFileAlt}
            title="Hard copy"
            description="Download the blank attendance sheet (PDF) to print and sign."
            onClick={downloadBlankSheet}
          />
          {error && (
            <p className="text-xs text-danger" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

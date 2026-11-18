"use client";

import { FaQrcode } from "react-icons/fa";
import { effectiveStatus, attendanceWindow } from "@/data/lib/eventStatus";
import { formatLongDay } from "@/data/lib/eventDates";

/* The Overview only ever prints whole (Manila) days here. */
const formatDateOnly = (value) => formatLongDay(value, "an unknown date");

/* Plain-language state of the QR window, from the same helper the attendance
   APIs use — so what this banner says is exactly what a scanning guest gets.
   Null once the event has ended: the Overview shows its own "ended" note.
   (A "check-in closed" state could never be reached: a passed end date
   already makes the event completed.) */
export function checkInStatusOf(event, now = Date.now()) {
  const phase = effectiveStatus(event, new Date(now));
  if (phase === "cancelled") {
    return {
      tone: "danger",
      title: "Event cancelled",
      detail: "Check-in is closed. No further attendance can be recorded.",
      classes: "border-red-200 bg-red-50 text-red-700",
    };
  }
  if (phase === "completed") return null;

  const { earliestStart, latestEnd } = attendanceWindow(event);

  if (earliestStart !== null && now < earliestStart) {
    return {
      tone: "pending",
      title: "Check-in not open yet",
      detail: `Opens ${formatDateOnly(new Date(earliestStart))}. The QR code will not accept guests until then.`,
      classes: "border-secondary-200 bg-secondary-50 text-secondary-700",
    };
  }
  return {
    tone: "open",
    title: "Check-in is open",
    detail:
      latestEnd === null
        ? "Guests can scan the QR code now."
        : `Guests can scan the QR code until ${formatDateOnly(new Date(latestEnd))}.`,
    classes: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
}

/* Whether the QR code actually works right now. The window was already
   enforced in two API routes but never shown here, so an organiser could not
   tell if check-in was open until a guest failed. */
export default function CheckInStatusBanner({ event }) {
  const status = checkInStatusOf(event);
  if (!status) return null;
  return (
    <div
      className={`rounded-xl border p-4 flex items-start gap-3 ${status.classes}`}
      role="status"
    >
      <FaQrcode className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold">{status.title}</p>
        <p className="mt-0.5 text-sm opacity-80">{status.detail}</p>
      </div>
    </div>
  );
}

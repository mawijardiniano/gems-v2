"use client";

import { useState } from "react";
import { FaDownload } from "react-icons/fa";
import {
  buildGanttPdf,
  ganttPdfFilename,
  ganttRows,
  pickGanttYear,
  resolveAutoTable,
} from "@/lib/ganttPdf";

/*
 * Downloadable Gantt chart (landscape A4 PDF) for a monitored project: the
 * letterhead, the activities table and the Jan-Dec timeline with solid bars.
 * jspdf and jspdf-autotable are pulled in on click so they never reach the
 * initial bundle - the same pattern as the attendance sheet and quick reports.
 */

/* Preload the university logo as a data URL so it can be embedded in the PDF. */
const loadLogo = () => {
  if (typeof window === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext("2d").drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = "/getThemePhoto.png";
  });
};

export default function PrintGantt({
  project,
  label = "Download Gantt",
  className = "inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
}) {
  const activities = ganttRows(project);
  const [busy, setBusy] = useState(false);

  const handleDownload = async () => {
    if (activities.length === 0 || busy) return;
    setBusy(true);

    try {
      const [{ jsPDF }, autoTableModule, logoDataUrl] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
        loadLogo(),
      ]);

      const pdf = buildGanttPdf({
        jsPDF,
        project,
        activities,
        autoTable: resolveAutoTable(autoTableModule),
        logoDataUrl,
      });

      pdf.save(ganttPdfFilename(project, pickGanttYear(project, activities)));
    } catch (err) {
      console.error("Gantt chart export failed", err);
      alert("Unable to generate the Gantt chart. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={activities.length === 0 || busy}
      title={
        activities.length === 0
          ? "No activities yet - nothing to download"
          : "Download the project Gantt chart as a PDF"
      }
      className={className}
    >
      <FaDownload className="h-3 w-3" />
      {busy ? "Preparing..." : label}
    </button>
  );
}

"use client";

import { useEffect, useState } from "react";
import axios from "axios";

/* Downloads the year's milestone progress PDF ("overall" or "project").
   The report is year-wide: the page's office/status/search filters only
   narrow the on-screen list. */
export function useProgressReport(year) {
  const [generating, setGenerating] = useState(null);
  const [reportError, setReportError] = useState("");

  useEffect(() => {
    if (!reportError) return undefined;
    const timer = setTimeout(() => setReportError(""), 6000);
    return () => clearTimeout(timer);
  }, [reportError]);

  const download = async (mode) => {
    if (!year || generating) return;
    setReportError("");
    setGenerating(mode);
    try {
      const res = await axios.get(
        `/api/reports/gpb-progress?year=${encodeURIComponent(year)}&mode=${mode}`,
        { responseType: "blob" },
      );

      const dispositionFilename =
        (res.headers?.["content-disposition"] || "").split("filename=")[1] || "";
      const fallback =
        mode === "project"
          ? `gpb-progress-${year}-per-project.pdf`
          : `gpb-progress-${year}.pdf`;

      const url = window.URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = dispositionFilename.replace(/"/g, "") || fallback;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      let message = "Could not generate the milestone progress report.";
      const data = err?.response?.data;
      if (data instanceof Blob) {
        try {
          const parsed = JSON.parse(await data.text());
          message = parsed.message || parsed.error || message;
        } catch {
          /* keep the default message when the body is not JSON */
        }
      } else if (data?.message) {
        message = data.message;
      }
      setReportError(message);
    } finally {
      setGenerating(null);
    }
  };

  return { generating, reportError, download };
}

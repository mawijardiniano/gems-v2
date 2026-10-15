/* Writes a sample Gantt chart PDF so the multi-year timeline layout can be
   eyeballed without signing in and downloading from the app.
   Run: node scripts/preview-gantt-chart.mjs

   Output (repo root, safe to delete):
     gantt-chart-preview.pdf
*/
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { buildGanttPdf } from "../lib/ganttPdf.js";

const here = path.dirname(fileURLToPath(import.meta.url));

/* GPB-2031-002 as reported: activity 2 starts in Q1 2025 and ends Feb 2026. */
const project = {
  reference_number: "GPB-2031-002",
  gad_activity: {
    value: [
      "Creation of system",
      "Conduct gender sensitivity orientations for newly hired employees",
      "Procurement of equipment",
    ],
  },
  responsible_office: { value: ["GAD Unit", "College of Information and Computing Sciences"] },
  year: 2025,
  gantt_activities: [
    {
      activity: "Project Preparation and Coordination",
      start_date: "2025-01-06",
      end_date: "2025-01-31",
      person_responsible: "GAD Office",
    },
    {
      activity: "Develop Training Materials",
      start_date: "2025-03-03",
      end_date: "2026-02-28",
      person_responsible: "Training Team",
    },
    {
      activity: "Q3 Field Rollout (crosses into next year)",
      start_date: "2025-09-15",
      end_date: "2026-03-20",
      person_responsible: "Training Team",
    },
  ],
};

const pdf = buildGanttPdf({
  jsPDF,
  project,
  activities: project.gantt_activities,
  autoTable: typeof autoTable === "function" ? autoTable : autoTable.default,
  logoDataUrl: null,
});

const target = path.join(here, "..", "gantt-chart-preview.pdf");
writeFileSync(target, Buffer.from(pdf.output("arraybuffer")));
console.log("Wrote gantt-chart-preview.pdf");
console.log("Text layer:");
console.log(pdf.output("text"));

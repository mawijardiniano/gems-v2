/* Writes sample PDFs of the regenerated GAD Projects Milestone Progress Report
   so the layout can be eyeballed without signing in and downloading from the
   app. Run: node scripts/preview-gpb-progress.mjs

   Output (repo root, safe to delete):
     gpb-progress-preview-per-project.pdf
     gpb-progress-preview-quarterly.pdf
*/
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildPerProjectReport,
  buildQuarterlyReport,
} from "../lib/gpbProgressPdf.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const YEAR = 2031;

const projects = [
  {
    reference_number: "GPB-2031-001",
    gad_activity: {
      value: [
        "Conduct the Annual National Women's Month Celebration through Gender Equality and Women Empowerment Activities",
        "Organize University-wide activities in line with the National Women's Month Celebration such as forums, exhibits, cultural presentations, and recognition programs that highlight women's contributions in history and society. The celebration will promote gender equality, raise awareness on women's rights, and strengthen advocacy for women's empowerment in accordance with national proclamations and RA 6949.",
      ],
    },
    project_type: { value: "Client Focused" },
    project_status: "ongoing",
    milestones: [
      {
        title: "Planning meeting with GAD focal persons",
        status: "completed",
        target_date: "2031-01-20",
        actual_date: "2031-01-18",
        proofs: [{ url: "a" }, { url: "b" }],
      },
      {
        title: "Forums, exhibits and cultural presentations",
        status: "ongoing",
        target_date: "2031-03-08",
        actual_date: null,
        proofs: [{ url: "c" }],
      },
      {
        title: "Recognition program for women achievers",
        status: "pending",
        target_date: "2031-03-28",
        actual_date: null,
        proofs: [],
      },
    ],
  },
  {
    reference_number: "GPB-2031-002",
    gad_activity: {
      value: "Conduct gender sensitivity orientations for newly hired employees",
    },
    project_type: { value: "Organization Focused" },
    project_status: "for-review",
    milestones: [],
  },
  {
    reference_number: "GPB-2031-003",
    gad_activity: {
      value:
        "Establish the GAD monitoring dashboard with sex-disaggregated indicators",
    },
    project_type: { value: "Attributed Program" },
    project_status: "completed",
    milestones: [
      {
        title: "Requirements gathering with the ICT unit",
        status: "completed",
        target_date: "2031-02-10",
        actual_date: "2031-02-09",
        proofs: [{ url: "d" }, { url: "e" }, { url: "f" }],
      },
      {
        title: "Dashboard turnover and training",
        status: "completed",
        target_date: "2031-05-30",
        actual_date: "2031-05-28",
        proofs: [{ url: "g" }],
      },
    ],
  },
];

const outputs = [
  ["gpb-progress-preview-per-project.pdf", buildPerProjectReport(projects, YEAR)],
  ["gpb-progress-preview-quarterly.pdf", buildQuarterlyReport(projects, YEAR, 1)],
];

for (const [name, buffer] of outputs) {
  const target = path.join(here, "..", name);
  writeFileSync(target, buffer);
  console.log("Wrote", name);
}

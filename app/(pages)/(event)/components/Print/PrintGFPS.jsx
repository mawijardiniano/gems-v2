"use client";

import {
  SECTIONS as DEFAULT_SECTIONS,
  getSectionData,
} from "../../gfps/gfps-config";

const PRINT_STYLES = `
  body {
    font-family: Arial, sans-serif;
    padding: 20px;
  }

  h2 {
    text-align: center;
    margin-bottom: 10px;
  }

  .header {
    text-align: center;
    margin-bottom: 20px;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin-top: 20px;
  }

  th, td {
    border: 1px solid #333;
    padding: 8px;
    text-align: left;
    vertical-align: top;
  }

  th {
    background: #f2f2f2;
    text-align: center;
  }

  .section {
    font-weight: bold;
    background: #fafafa;
  }

  .members {
    white-space: pre-wrap;
  }
`;

/* The name to print for a member: its typed `official_text` is the source of
   truth. There is nothing to fall back to any more — the retired split
   `first_name` / `last_name` parts and the resolved roster seat both came from
   data that no longer exists on a GFPS row. */
const memberName = (m) => String(m?.official_text || "").trim();

const formatMember = (m) => {
  const name = memberName(m);

  /* The seat is the row's own `position_title`, which the memorandum defines
     independently of any appointment. The role label keeps an ad-hoc chair from
     printing with no position at all. */
  const position =
    String(m?.position_title || "").trim() || (m?.role === "chair" ? "Chair" : "");
  const label = position;

  /* An unfilled seat prints as "(Vacant)": the position is part of the
     memorandum, so the line is reported as unfilled rather than left blank,
     which would make the seat look as though it had been dropped. */
  if (!name && label) return `${label} (Vacant)`;
  return label ? `${label} (${name})` : name;
};

const buildSectionRow = (sec, gfps) => {
  const { members, chairData } = getSectionData(gfps, sec.key);

  if (chairData) {
    const name = memberName(chairData);
    const position = String(chairData.position_title || "").trim();
    return `
      <tr>
        <td class="section">${sec.label}</td>
        <td>
          ${position ? `<strong>${position}</strong><br/>` : ""}
          ${name || (position ? "<em>(Vacant)</em>" : "")}
        </td>
      </tr>
    `;
  }

  if (!members.length) return "";

  return `
    <tr>
      <td class="section">${sec.label}</td>
      <td class="members">${members.map(formatMember).join("<br/>")}</td>
    </tr>
  `;
};

const buildPrintHtml = (sections, gfps) => {
  const yearLabel = gfps?.academic_year ? ` — AY ${gfps.academic_year}` : "";
  return `
  <html>
    <head>
      <title>GFPS Report</title>
      <style>${PRINT_STYLES}</style>
    </head>

    <body>
      <div class="header">
        <h2>Gender and Development Focal Point System (GFPS)${yearLabel}</h2>
      </div>

      <table>
        <thead>
          <tr>
            <th>Section</th>
            <th>Officials</th>
          </tr>
        </thead>

        <tbody>
          ${sections.map((sec) => buildSectionRow(sec, gfps)).join("")}
        </tbody>
      </table>
    </body>
  </html>
`;
};

const printHtml = (html) => {
  const iframe = document.createElement("iframe");

  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
  });

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(html);
  doc.close();

  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  };
};

export default function PrintGFPS({ SECTIONS = DEFAULT_SECTIONS, gfps = {} }) {
  return (
    <button
      className="px-4 py-2 bg-secondary-600 text-white rounded-xl  hover:bg-secondary-700"
      onClick={() => printHtml(buildPrintHtml(SECTIONS, gfps))}
    >
      Print GFPS
    </button>
  );
}

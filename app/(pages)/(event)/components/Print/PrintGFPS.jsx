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

const formatMember = (m) => {
  const o = m?.official || {};
  const name = `${o.first_name || ""} ${o.last_name || ""}`.trim();
  const position = o.position || "";
  const extra = o.branch || o.college ? ` - ${o.branch || o.college}` : "";
  return `${position}${extra} (${name})`;
};

const buildSectionRow = (sec, gfps) => {
  const { members, chairData } = getSectionData(gfps, sec.key);

  if (chairData) {
    const o = chairData.official || {};
    const name = `${o.first_name || ""} ${o.last_name || ""}`.trim();
    const position = o.position || "";
    return `
      <tr>
        <td class="section">${sec.label}</td>
        <td>
          <strong>${position}</strong><br/>
          ${name}
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

const buildPrintHtml = (sections, gfps) => `
  <html>
    <head>
      <title>GFPS Report</title>
      <style>${PRINT_STYLES}</style>
    </head>

    <body>
      <div class="header">
        <h2>Gender and Development Focal Point System (GFPS)</h2>
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
      className="px-4 py-2 bg-blue-600 text-white rounded-xl  hover:bg-blue-700"
      onClick={() => printHtml(buildPrintHtml(SECTIONS, gfps))}
    >
      Print GFPS
    </button>
  );
}

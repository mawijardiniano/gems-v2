"use client";

import { buildOrgChart, getOfficialPersonName } from "@/lib/universityOfficialsMerge";

/**
 * Prints the assigned MarSU officials roster (assigned-only mode).
 * Only assigned rows print — no vacant seats, no unlisted section.
 */
export default function PrintUniversityOfficials({ officials, academicYear }) {
  const handlePrintOfficials = () => {
    const chart = buildOrgChart(officials);
    const yearLabel = academicYear ? ` — AY ${academicYear}` : "";

    const sectionsHtml = chart.byHeader
      .map(({ header, seats }) => {
        const rows = seats
          .map((seat) => {
            const official = seat.official;
            const name = getOfficialPersonName(
              official?.name_text || official?.name,
            );
            return `
              <tr>
                <td>${seat.position}</td>
                <td>${name}</td>
              </tr>
            `;
          })
          .join("");

        return `
          <h4>${header}</h4>
          <table>
            <thead>
              <tr>
                <th style="width: 62%">Position / Designation</th>
                <th>Name</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `;
      })
      .join("");

    const html = `
    <html>
      <head>
        <title>MarSU Offices and Administrative Designations</title>
        <style>
  body {
    font-family: Arial, sans-serif;
    padding: 20px;
    margin: 0;
  }

  h2 {
    text-align: center;
    margin: 0 0 4px 0;
  }

  .subtitle {
    text-align: center;
    font-size: 12px;
    color: #444;
    margin: 0 0 18px 0;
  }

  h4 {
    margin: 16px 0 6px 0;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin: 6px 0 12px 0;
  }

  th, td {
    border: 1px solid #333;
    padding: 6px;
    font-size: 12px;
  }

  th {
    background: #f2f2f2;
  }

  .vacant {
    color: #999;
    text-align: center;
  }
</style>
      </head>
      <body>
        <h2>MARINDUQUE STATE UNIVERSITY</h2>
        <p class="subtitle">Offices &amp; Administrative Designations${yearLabel}</p>

        ${sectionsHtml}
      </body>
    </html>
  `;

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

  return (
    <button
      onClick={handlePrintOfficials}
      className="px-5 py-2 rounded-xl bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition font-semibold"
    >
      Print Officials
    </button>
  );
}

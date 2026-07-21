"use client";

export default function PrintGFPS({ SECTIONS = {}, gfps = {} }) {
  const handlePrintGFPS = () => {
    const html = `
    <html>
      <head>
        <title>GFPS Report</title>
        <style>
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
        </style>
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
            ${Object.entries(SECTIONS)
              .map(([_, sec]) => {
                let members = [];

                if (
                  sec.key === "executiveCommittee" ||
                  sec.key === "technicalWorkingGroup"
                ) {
                  members = gfps?.[sec.key]?.members || [];
                } else if (sec.key === "secretariat") {
                  members = Array.isArray(gfps[sec.key]) ? gfps[sec.key] : [];
                } else if (sec.key === "chairOrHeadOfAgency") {
                  const chair = gfps?.[sec.key];
                  if (!chair) return "";

                  const o = chair.official || {};
                  const name =
                    `${o.first_name || ""} ${o.last_name || ""}`.trim();
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

                const formatted = members
                  .map((m) => {
                    const o = m.official || {};
                    const name =
                      `${o.first_name || ""} ${o.last_name || ""}`.trim();
                    const position = o.position || "";
                    const extra =
                      o.branch || o.college
                        ? ` - ${o.branch || o.college}`
                        : "";

                    return `${position}${extra} (${name})`;
                  })
                  .join("<br/>");

                return `
                  <tr>
                    <td class="section">${sec.label}</td>
                    <td class="members">${formatted}</td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
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
      className="px-4 py-2 bg-blue-600 text-white rounded-xl  hover:bg-blue-700"
      onClick={handlePrintGFPS}
    >
      Print GFPS
    </button>
  );
}

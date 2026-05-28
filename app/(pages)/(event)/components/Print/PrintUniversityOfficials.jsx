"use client"

export default function PrintUniversityOfficials({
officials,
SECTIONS,
getUserFullName 
}) {
    const handlePrintOfficials = () => {
    if (!officials) return;

    const html = `
    <html>
      <head>
        <title>University Officials Report</title>
       <style>
  body {
    font-family: Arial, sans-serif;
    padding: 20px;
    margin: 0;
  }

  h2 {
    text-align: center;
    margin: 0 0 20px 0;
  }

  h4 {
    margin: 16px 0 6px 0;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin: 10px; 
  }

  th, td {
    border: 1px solid #333;
    padding: 6px;
    font-size: 12px;
  }

  th {
    background: #f2f2f2;
  }
</style>
      </head>
      <body>
        <h2>University Officials Report</h2>

        ${SECTIONS.map((sec) => {
          const sectionData = Array.isArray(officials[sec.key])
            ? officials[sec.key]
            : officials[sec.key]
              ? [officials[sec.key]]
              : [];

          if (!sectionData.length) return "";

          return `
            <h4>${sec.label}</h4>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Position</th>
                  ${
                    sec.key === "campusDirectors"
                      ? "<th>Branch</th>"
                      : sec.key === "collegeDeans" ||
                          sec.key === "associateDeans"
                        ? "<th>College</th>"
                        : ""
                  }
                </tr>
              </thead>
              <tbody>
                ${sectionData
                  .map((o) => {
                    const name = getUserFullName(o.name);
                    const position = o.position || "";
                    const branch = o.branch || "";
                    const college = o.college || "";

                    return `
                      <tr>
                        <td>${name}</td>
                        <td>${position}</td>
                        ${
                          sec.key === "campusDirectors"
                            ? `<td>${branch}</td>`
                            : sec.key === "collegeDeans" ||
                                sec.key === "associateDeans"
                              ? `<td>${college}</td>`
                              : ""
                        }
                      </tr>
                    `;
                  })
                  .join("")}
              </tbody>
            </table>
         
          `;
        }).join("")}
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
            className="mb-4 px-5 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition font-semibold"
          >
            Print Officials
          </button>
 )
}
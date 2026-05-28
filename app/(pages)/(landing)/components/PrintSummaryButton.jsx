"use client";

export default function PrintSummaryButton({
  totalPopulation,
  totalMale,
  totalFemale,
  totalUnspecified,
  totalEmployee,
  totalMaleEmployee,
  totalFemaleEmployee,
  totalUnspecifiedEmployee,
  totalStudent,
  totalMaleStudent,
  totalFemaleStudent,
  totalUnspecifiedStudent,
  yearLineData,
  collegeData,
  officeData,
}) {
  const handlePrintSummary = () => {
    const yearRows = yearLineData
      .map(
        (row) => `
          <tr>
            <td>${row.year}</td>
            <td>${row.male}</td>
            <td>${row.female}</td>
            <td>${row.male + row.female}</td>
          </tr>
        `,
      )
      .join("");

    const collegeRows = collegeData
      .map(
        (row) => `
          <tr>
            <td>${row.college}</td>
            <td>${row.male}</td>
            <td>${row.female}</td>
            <td>${row.male + row.female}</td>
          </tr>
        `,
      )
      .join("");

    const officeRows = officeData
      .map(
        (row) => `
          <tr>
            <td>${row.office}</td>
            <td>${row.male}</td>
            <td>${row.female}</td>
            <td>${row.male + row.female}</td>
          </tr>
        `,
      )
      .join("");

    const html = `
      <html>
        <head>
          <title>Campus Gender Summary</title>

          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }

            h2, h3 {
              text-align: center;
              margin-top: 25px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }

            th, td {
              border: 1px solid #333;
              padding: 8px;
              text-align: center;
            }

            th {
              background: #f3f4f6;
            }
          </style>
        </head>

        <body>

          <h2>Campus Gender Equality Summary</h2>

          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Total</th>
                <th>Male</th>
                <th>Female</th>
                <th>Unspecified</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>Overall Population</td>
                <td>${totalPopulation}</td>
                <td>${totalMale}</td>
                <td>${totalFemale}</td>
                <td>${totalUnspecified}</td>
              </tr>

              <tr>
                <td>Employees</td>
                <td>${totalEmployee}</td>
                <td>${totalMaleEmployee}</td>
                <td>${totalFemaleEmployee}</td>
                <td>${totalUnspecifiedEmployee}</td>
              </tr>

              <tr>
                <td>Students</td>
                <td>${totalStudent}</td>
                <td>${totalMaleStudent}</td>
                <td>${totalFemaleStudent}</td>
                <td>${totalUnspecifiedStudent}</td>
              </tr>
            </tbody>
          </table>

          <h3>Employees per Office</h3>

          <table>
            <thead>
              <tr>
                <th>Office</th>
                <th>Male</th>
                <th>Female</th>
                <th>Total</th>
              </tr>
            </thead>

            <tbody>
              ${officeRows}
            </tbody>
          </table>

          <h3>Students per College</h3>

          <table>
            <thead>
              <tr>
                <th>College</th>
                <th>Male</th>
                <th>Female</th>
                <th>Total</th>
              </tr>
            </thead>

            <tbody>
              ${collegeRows}
            </tbody>
          </table>

          <h3>Students by Year Level</h3>

          <table>
            <thead>
              <tr>
                <th>Year Level</th>
                <th>Male</th>
                <th>Female</th>
                <th>Total</th>
              </tr>
            </thead>

            <tbody>
              ${yearRows}
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

    const frameDoc = iframe.contentWindow?.document;

    if (!frameDoc) return;

    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();

      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    };
  };

  return (
    <button
      onClick={handlePrintSummary}
      className="absolute right-5 top-0 bg-violet-700 hover:bg-violet-800 text-white px-5 py-2 rounded-lg"
    >
      Print
    </button>
  );
}
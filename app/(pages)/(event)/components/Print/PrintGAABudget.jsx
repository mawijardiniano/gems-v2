"use client"
import {
  FaEdit,
  FaPlus,
  FaPrint,
  FaTimes,
  FaMoneyBillWave,
} from "react-icons/fa";

export default function PrintGAABudget({
budgets,

}) {
const handlePrintBudgets = () => {
    const html = `
    <html>
      <head>
        <title>GAA Budget Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h2 { text-align: center; margin-bottom: 10px; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #333; padding: 8px; text-align: center; }
          th { background: #f2f2f2; }
          .header { text-align: center; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Annual GAA Budget Report</h2>
        </div>

        <table>
          <thead>
            <tr>
              <th>Year</th>
              <th>Total GAA (₱)</th>
              <th>GAD %</th>
              <th>GAD Budget (₱)</th>
            </tr>
          </thead>
          <tbody>
            ${budgets
              .map((b) => {
                const totalGAA = Number(b.totalGAA || 0).toLocaleString(
                  undefined,
                  {
                    minimumFractionDigits: 2,
                  },
                );

                const gadBudget = Number(b.gadAnnualBudget || 0).toLocaleString(
                  undefined,
                  {
                    minimumFractionDigits: 2,
                  },
                );

                return `
                  <tr>
                    <td>${b.year}</td>
                    <td>${totalGAA}</td>
                    <td>${b.gadPercent}%</td>
                    <td>${gadBudget}</td>
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
            onClick={handlePrintBudgets}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-white border border-gray-200 hover:bg-gray-100 transition shadow-sm"
          >
            <FaPrint />
            Print Report
          </button>
 )
}
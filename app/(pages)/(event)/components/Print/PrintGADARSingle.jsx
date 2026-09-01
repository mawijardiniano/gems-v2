"use client";

import { FaPrint } from "react-icons/fa";

const getFieldValue = (field) => {
  if (!field) return "";
  if (typeof field === "object" && !Array.isArray(field) && "value" in field) {
    return field.value ?? "";
  }
  return field;
};

const getArrayValue = (field) => {
  const v = getFieldValue(field);
  if (Array.isArray(v)) return v.filter(Boolean);
  if (v) return [v];
  return [];
};

const getProjectTypeLabel = (project) => {
  const rawType = project?.project_type;
  const value =
    rawType && typeof rawType === "object" ? rawType.value : rawType;
  if (value === "Client Focused") return "Client-Focused Activities";
  if (value === "Organization Focused")
    return "Organization-Focused Activities";
  if (value === "Attributed Program") return "Attributed Program";
  return "Uncategorized";
};

const fmt = (n) =>
  Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * Prints a single GAD AR project using the official GAD Accomplishment
 * Report table layout only (header + main table + that project's row).
 * No summary/budget block and no signatories — that's handled by PrintGADAR.
 */
export default function PrintGADARSingle({ year, project }) {
  const handlePrint = () => {
    if (!project) return;

    const now = new Date();
    const reportDate = `${now.getMonth() + 1}-${now.getDate()}-${String(
      now.getFullYear(),
    ).slice(-2)}`;

    const causes = getArrayValue(project.cause_gender_issue);
    const objectives = getArrayValue(project.gad_objective);
    const activities = getArrayValue(project.gad_activity);
    const indicators = getArrayValue(project.performance_indicator_target);

    let actualText = "";
    if (Array.isArray(project.actual_accomplishment)) {
      actualText = project.actual_accomplishment[0] || "";
    } else if (typeof project.actual_accomplishment === "string") {
      actualText = project.actual_accomplishment;
    }

    const projectTypeLabel = getProjectTypeLabel(project);
    const isAttributedProgram = projectTypeLabel === "Attributed Program";
    const actualCell = isAttributedProgram ? "" : actualText || "";

    const renderList = (arr) =>
      arr.length > 0
        ? arr.map((item, i) => `${i + 1}. ${item}`).join("<br/>")
        : "";

    const rows = `
          <tr class="type-header"><td colspan="11">${projectTypeLabel}</td></tr>
          <tr>
            <td class="cell num">1</td>
            <td class="cell">${getFieldValue(project.gender_issue) || ""}</td>
            <td class="cell">${renderList(causes)}</td>
            <td class="cell">${renderList(objectives)}</td>
            <td class="cell">${getFieldValue(project.relevant_agency) || ""}</td>
            <td class="cell">${renderList(activities)}</td>
            <td class="cell">${renderList(indicators)}</td>
            <td class="cell">${actualCell}</td>
            <td class="cell num">₱ ${fmt(getFieldValue(project.gad_budget))}</td>
            <td class="cell num">${
              project.actual_expenditures
                ? `₱ ${fmt(project.actual_expenditures)}`
                : ""
            }</td>
            <td class="cell">${getFieldValue(project.responsible_office) || ""}</td>
          </tr>
        `;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>GAD Accomplishment Report ${year}</title>
        <style>
          @page {
            size: legal landscape;
            margin: 1cm;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 11px;
            color: #000;
            padding: 0;
            margin: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: #e5e7eb;
            padding: 6px 10px;
            font-size: 10px;
            text-align: right;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-footer .page-num::after {
            content: "Page " counter(page) " of " counter(pages);
          }
          table {
            page-break-inside: auto;
          }
          thead {
            display: table-header-group;
          }
          tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { font-size: 17px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; }
          .header p { font-size: 12px; margin-top: 4px; }
          table.main-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          table.main-table th,
          table.main-table td {
            border: 1px solid #000;
            padding: 6px 4px;
            vertical-align: top;
            text-align: left;
          }
          table.main-table th {
            background: #f0f0f0;
            font-weight: bold;
            text-align: center;
            font-size: 9px;
            text-transform: uppercase;
          }
          td.cell { font-size: 10px; line-height: 1.4; }
          td.num { text-align: right; white-space: nowrap; }
          .type-header td {
            font-weight: bold;
            text-align: center !important;
          }
        </style>
      </head>
      <body>
        <div class="print-footer">Report Generated: ${reportDate} &nbsp; <span class="page-num"></span></div>
        <div class="header">
          <h1>ANNUAL GENDER AND DEVELOPMENT (GAD) ACCOMPLISHMENT REPORT</h1>
          <p>FY: <strong>${year}</strong></p>
        </div>

        <table class="main-table">
          <thead>
            <tr>
              <th style="width:4%"></th>
              <th style="width:9%">Gender Issue / GAD Mandate</th>
              <th style="width:10%">Cause of Gender Issue</th>
              <th style="width:10%">GAD Result Statement / GAD Objective</th>
              <th style="width:9%">Relevant Organization MFO/PAP or PPA</th>
              <th style="width:10%">GAD Activity</th>
              <th style="width:10%">Performance Indicator / Target</th>
              <th style="width:12%">Actual Result (Outputs/Outcomes)</th>
              <th style="width:7%">Total Agency Approved Budget</th>
              <th style="width:7%">Actual Cost Expenditure</th>
              <th style="width:12%">Responsible Unit/Office</th>
            </tr>
            <tr>
              <th></th>
              <th>1</th>
              <th>2</th>
              <th>3</th>
              <th>4</th>
              <th>5</th>
              <th>6</th>
              <th>7</th>
              <th>8</th>
              <th>9</th>
              <th>10</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
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
      setTimeout(() => document.body.removeChild(iframe), 1000);
    };
  };

  return (
    <button
      onClick={handlePrint}
      title="Print this project"
      className="inline-flex items-center justify-center px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-all"
    >
      <FaPrint className="h-3 w-3" />
    </button>
  );
}
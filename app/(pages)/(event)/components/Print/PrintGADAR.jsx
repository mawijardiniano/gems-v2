"use client";

import { useEffect, useRef, useState } from "react";
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

export default function PrintGADAR({ year, projects, gaaBudget }) {
  const printRef = useRef(null);
  const [signatories, setSignatories] = useState({
    focalPointName: "____________________________",
    presidentName: "____________________________",
  });

  function toDisplayName(firstName, middleName, lastName, options = {}) {
    const includeMiddleInitial = options.includeMiddleInitial !== false;
    const middleInitial =
      includeMiddleInitial && middleName
        ? `${middleName.toString().trim().charAt(0).toUpperCase()}.`
        : "";
    return [firstName, middleInitial, lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  function extractNameFromUserAuth(userAuth, options = {}) {
    if (!userAuth) return "";
    const firstName =
      userAuth?.personal_info_id?.personal?.first_name || userAuth?.first_name;
    const middleName =
      userAuth?.personal_info_id?.personal?.middle_name ||
      userAuth?.middle_name;
    const lastName =
      userAuth?.personal_info_id?.personal?.last_name || userAuth?.last_name;
    return toDisplayName(firstName, middleName, lastName, options);
  }

  useEffect(() => {
    async function loadSignatories() {
      try {
        const officialsRes = await fetch("/api/university-officials");
        const officialsJson = await officialsRes.json();
        const officials = officialsJson?.data?.[0] || {};

        const presidentName = extractNameFromUserAuth(
          officials?.president?.name,
          { includeMiddleInitial: true },
        );

        const focalEntry = (officials?.office_of_the_president || []).find(
          (item) =>
            item?.position
              ?.toString()
              .toLowerCase()
              .includes("focal point/person, gender & development"),
        );
        const focalName = extractNameFromUserAuth(focalEntry?.name);

        setSignatories({
          focalPointName: focalName || "____________________________",
          presidentName: presidentName || "____________________________",
        });
      } catch {
        setSignatories({
          focalPointName: "____________________________",
          presidentName: "____________________________",
        });
      }
    }

    loadSignatories();
  }, []);

  const totalBudget = projects.reduce(
    (s, p) => s + (Number(getFieldValue(p.gad_budget)) || 0),
    0,
  );
  const totalExpenditures = projects.reduce(
    (s, p) => s + (Number(p.actual_expenditures) || 0),
    0,
  );

  const totalGAA = Number(gaaBudget?.totalGAA) || 0;
  const originalBudget = Number(gaaBudget?.gadAnnualBudget) || 0;
  const hasBudget = Boolean(gaaBudget);

  const totalGAADisplay = hasBudget ? `₱ ${fmt(totalGAA)}` : "To follow";
  const originalBudgetDisplay = hasBudget
    ? `₱ ${fmt(originalBudget)}`
    : "To follow";

  const utilPct =
    originalBudget > 0
      ? ((totalExpenditures / originalBudget) * 100).toFixed(2)
      : "0.00";
  const gadPct =
    totalGAA > 0 ? ((totalExpenditures / totalGAA) * 100).toFixed(2) : "0.00";

  const handlePrint = () => {

    const now = new Date();
    const reportDate = `${now.getMonth() + 1}-${now.getDate()}-${String(
      now.getFullYear(),
    ).slice(-2)}`;

    const projectTypeOrder = {
      "Client-Focused Activities": 0,
      "Organization-Focused Activities": 1,
      "Attributed Program": 2,
      Uncategorized: 3,
    };

    const orderedProjects = [...projects]
      .map((project, originalIndex) => ({ project, originalIndex }))
      .sort((a, b) => {
        const aType = getProjectTypeLabel(a.project);
        const bType = getProjectTypeLabel(b.project);
        const byType = projectTypeOrder[aType] - projectTypeOrder[bType];
        if (byType !== 0) return byType;
        return a.originalIndex - b.originalIndex;
      })
      .map((entry) => entry.project);

    const rows = orderedProjects
      .map((project, index) => {
        const projectTypeLabel = getProjectTypeLabel(project);
        const prevProject = orderedProjects[index - 1];
        const prevTypeLabel = prevProject
          ? getProjectTypeLabel(prevProject)
          : null;
        const shouldShowTypeHeader =
          index === 0 || prevTypeLabel !== projectTypeLabel;

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

        const isAttributedProgram = projectTypeLabel === "Attributed Program";
        const actualCell = isAttributedProgram ? "" : actualText || "";

        const renderList = (arr) =>
          arr.length > 0
            ? arr.map((item, i) => `${i + 1}. ${item}`).join("<br/>")
            : "";

        const sectionHeader = shouldShowTypeHeader
          ? `<tr class="type-header"><td colspan="11">${projectTypeLabel}</td></tr>`
          : "";

        return `${sectionHeader}
          <tr>
            <td class="cell num">${index + 1}</td>
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
      })
      .join("");

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

          /* ── Print pagination ─────────────────────────── */
          table {
            page-break-inside: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
          tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .table-space {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .signatures {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { font-size: 17px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; }
          .header p { font-size: 12px; margin-top: 4px; }

          /* ── Summary table ─────────────────────────────── */
          table.summary-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 0;
          }
          table.summary-table td {
            border: 1px solid #000;
            padding: 6px 8px;
            vertical-align: top;
            font-size: 11px;
          }
          table.summary-table td.label {
            background: #f0f0f0;
            font-weight: bold;
            white-space: nowrap;
            width: 22%;
          }
          table.summary-table td.value {
            width: 28%;
          }
          table.summary-table tr.full-row td {
            width: 100%;
          }
          table.summary-table tr.full-row td.label {
            background: #f0f0f0;
            width: auto;
          }

          /* ── Budget block ── only spans LEFT HALF ──────── */
          .budget-container {
            width: 100%;
            border-collapse: collapse;
            margin-top: 0;
          }
.budget-wrapper {
  width: 100%;
  border-collapse: collapse;
  margin-top: 0;
}

          .budget-wrapper td {
            border: 1px solid #000;
            padding: 6px 8px;
            vertical-align: top;
            font-size: 11px;
          }
          .budget-wrapper td.label {
            background: #f0f0f0;
            font-weight: bold;
            white-space: nowrap;
          }
          .budget-wrapper td.empty {
            background: #fff;
          }

          /* ── Main A-J table ────────────────────────────── */
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
          tr.total-row td { font-weight: bold; background: #f8f8f8; }
          .muted { color: #999; font-style: italic; }
          .type-header td {
            font-weight: bold;
            text-align: center !important;
          }


          .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 60px;
            padding: 0 40px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .sig-block { text-align: center; width: 250px; }
          .sig-line { border-top: 1px solid #000; margin-top: 60px; padding-top: 6px; font-weight: bold; font-size: 12px; }
          .sig-label { font-size: 11px; margin-top: 2px; }
          table.table-space {
            width: 100%;
            border-collapse: collapse;
            margin-top: 40px;
          }
          table.table-space th,
          table.table-space td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
            font-size: 11px;
          }
          table.table-space th {
            background: #f0f0f0;
            font-weight: bold;
            text-align: center;
          }
          .blank-space-1 {height: 30px; border-right: none}
          .blank-space-2 {height: 30px; border-left: none; border-right: none}
          .blank-space-3 {height: 30px; border-left: none}
          .date-border-1 {border-bottom: none}
          .date-border-2 {border-top: none}
          .date {width:200px}
        </style>
      </head>
      <body>
        <div class="print-footer">Report Generated: ${reportDate} &nbsp; <span class="page-num"></span></div>
        <div class="header">
          <h1>ANNUAL GENDER AND DEVELOPMENT (GAD) ACCOMPLISHMENT REPORT</h1>
          <p>FY: <strong>${year}</strong></p>
        </div>

        <!-- ── Row 1: Reference | Date Endorsed ───────────── -->
        <table class="summary-table">
          <tr>
            <td class="label">Reference:</td>
            <td class="label">Date Endorsed:</td>
          </tr>
          <!-- Row 2: Organization | Category -->
          <tr>
            <td class="label">Organization: Marinduque State University</td>
            <td class="label">Organization Category:</td>
          </tr>
          <!-- Row 3: Full width -->
          <tr class="full-row">
            <td class="label" colspan="2">Organization Hierarchy: Marinduque State University</td>
          </tr>
          <!-- Row 4: Full width -->
          <tr class="full-row">
            <td class="label" colspan="2">Total Budget/GAA of Organization: <strong>${totalGAADisplay}</strong></td>
          </tr>
        </table>

<!-- ── Budget block: 4 columns, only LEFT half ────── -->
<table class="budget-container">
  <tr>
    <td style="padding:0; border:none; width:50%;">
      <table class="budget-wrapper">
        <tr>
          <td class="label">Actual GAD Expenditure</td>
          <td class="num">₱ ${fmt(totalExpenditures)}</td>
          <td class="label">Original Budget</td>
          <td class="num">${originalBudgetDisplay}</td>
        </tr>
        <tr>
          <td class="empty"></td>
          <td class="empty"></td>
          <td class="label">% Utilization of Budget</td>
          <td class="num">${utilPct}%</td>
        </tr>
        <tr>
          <td class="label">% of GAD Expenditure:</td>
          <td class="num">${gadPct}%</td>
          <td class="empty"></td>
          <td class="empty"></td>
        </tr>
      </table>
    </td>
<td style="padding:0; border:none; width:50%;">
  <table class="budget-wrapper">
    <tr>
      <td class="empty" style="height: 25px;"></td>
    </tr>
    <tr>
      <td class="empty" style="height: 25px;"></td>
    </tr>
    <tr>
      <td class="empty" style="height: 25px;"></td>
    </tr>
  </table>
</td>

  </tr>
</table>


        <table class="main-table">
<thead>
  <tr>
    <th style="width:4%"></th>
    <th style="width:4%">Gender Issue / GAD Mandate</th>
    <th style="width:9%">Cause of Gender Issue</th>
    <th style="width:10%">GAD Result Statement / GAD Objective</th>
    <th style="width:8%">Relevant Organization MFO/PAP or PPA</th>
    <th style="width:10%">GAD Activity</th>
    <th style="width:10%">Performance Indicator / Target</th>
    <th style="width:10%">Actual Result (Outputs/Outcomes)</th>
    <th style="width:6%">Total Agency Approved Budget</th>
    <th style="width:6%">Actual Cost Expenditure</th>
    <th style="width:8%">Responsible Unit/Office</th>
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
            <tr class="total-row">
              <td></td>
              <td colspan="7" style="text-align:right; padding-right:10px;">TOTAL</td>
              <td class="num">₱ ${fmt(totalBudget)}</td>
              <td class="num">₱ ${fmt(totalExpenditures)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>

              <table class="table-space">
              <thead><tr>
          <th>Prepared By:</th>
          <th>Approved By:</th>
          <th class="date">Date</th>
        </tr></thead>
      <tbody>
      <tr>
      <td class="blank-space-1"></td>
<td class="blank-space-2"></td>
<td class="blank-space-3"></td>
      </tr>
      <tr>
        <td style="font-weight: bold">${signatories.focalPointName}</td>
    <td style="font-weight: bold">${signatories.presidentName}</td>
<td class="date-border-1"></td>
      </tr>
            <tr>
            <td style="font-weight: bold">GAD Focal Point/Person</td>
<td style="font-weight: bold">University President</td>
<td class="date-border-2"></td>
      </tr>

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
      disabled={projects.length === 0}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <FaPrint className="h-3.5 w-3.5" />
      Print Report
    </button>
  );
}

"use client";

import { useEffect, useState } from "react";

export default function PrintGPB({ totalGAA, budgetYear, projects, year }) {
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
    const displayName = toDisplayName(firstName, middleName, lastName, options);
    console.log("[PrintGPB] extractNameFromUserAuth", {
      firstName,
      middleName,
      lastName,
      options,
      displayName,
    });
    return displayName;
  }

  function extractNameFromGfpsOfficial(official, options = {}) {
    if (!official) return "";
    const firstName =
      official?.first_name ||
      official?.name?.personal_info_id?.personal?.first_name ||
      official?.personal_info_id?.personal?.first_name ||
      official?.personal_info_id?.first_name;
    const middleName =
      official?.middle_name ||
      official?.name?.personal_info_id?.personal?.middle_name ||
      official?.personal_info_id?.personal?.middle_name ||
      official?.personal_info_id?.middle_name;
    const lastName =
      official?.last_name ||
      official?.name?.personal_info_id?.personal?.last_name ||
      official?.personal_info_id?.personal?.last_name ||
      official?.personal_info_id?.last_name;
    const displayName = toDisplayName(firstName, middleName, lastName, options);
    console.log("[PrintGPB] extractNameFromGfpsOfficial", {
      firstName,
      middleName,
      lastName,
      options,
      displayName,
      official,
    });
    return displayName;
  }

  useEffect(() => {
    async function loadSignatories() {
      try {
        const [gfpsRes, officialsRes] = await Promise.all([
          fetch("/api/gfps"),
          fetch("/api/university-officials"),
        ]);

        const [gfpsJson, officialsJson] = await Promise.all([
          gfpsRes.json(),
          officialsRes.json(),
        ]);

        const gfps = gfpsJson?.data?.[0] || {};
        const officials = officialsJson?.data?.[0] || {};

        const presidentFromGfps = extractNameFromGfpsOfficial(
          gfps?.chairOrHeadOfAgency?.official,
          { includeMiddleInitial: true },
        );

        const presidentFromOfficials = extractNameFromUserAuth(
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
        const focalFromOfficials = extractNameFromUserAuth(focalEntry?.name);

        console.log("[PrintGPB] signatory sources", {
          presidentFromGfps,
          presidentFromOfficials,
          focalFromOfficials,
          gfpsChairOfficial: gfps?.chairOrHeadOfAgency?.official,
          focalEntry,
        });

        setSignatories({
          focalPointName: focalFromOfficials || "____________________________",
          presidentName:
            presidentFromGfps ||
            presidentFromOfficials ||
            "____________________________",
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

  const handlePrintProjects = () => {
    console.log("Year", budgetYear);
    let totalGAAFormatted = "";
    if (typeof totalGAA === "number" && !isNaN(totalGAA)) {
      totalGAAFormatted = totalGAA.toLocaleString(undefined, {
        minimumFractionDigits: 2,
      });
    } else if (typeof totalGAA === "string" && !isNaN(Number(totalGAA))) {
      totalGAAFormatted = Number(totalGAA).toLocaleString(undefined, {
        minimumFractionDigits: 2,
      });
    }

    const safeProjects = Array.isArray(projects) ? projects : [];

    const getProjectTypeLabel = (project) => {
      const rawType = project?.project_type;
      const value =
        rawType && typeof rawType === "object" ? rawType.value : rawType;

      if (value === "Client Focused") return "Client Focused";
      if (value === "Organization Focused") return "Organization Focused";
      return "Uncategorized";
    };

    const projectTypeOrder = {
      "Client Focused": 0,
      "Organization Focused": 1,
      Uncategorized: 2,
    };

    const orderedProjects = [...safeProjects]
      .map((project, originalIndex) => ({ project, originalIndex }))
      .sort((a, b) => {
        const aType = getProjectTypeLabel(a.project);
        const bType = getProjectTypeLabel(b.project);
        const byType = projectTypeOrder[aType] - projectTypeOrder[bType];

        if (byType !== 0) return byType;
        return a.originalIndex - b.originalIndex;
      })
      .map((entry) => entry.project);

    const html = `
      <html><head><title>Projects List</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        table { border-collapse: collapse; width: 100%; margin-top: 10px; }
        th, td { border: 1px solid #333; padding: 8px; text-align: left; }
        th { background: #f2f2f2; }
        .type-header td {
          font-weight: bold;
          background-color: #fdba74 !important;
          color: #000000 !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .gad-report-header { text-align: center; }
        .gad-report-header h4, .agency h4 { margin: 0; }
        .blank-space-1 {height: 30px; border-right: none}
        .blank-space-2 {height: 30px; border-left: none; border-right: none}
        .blank-space-3 {height: 30px; border-left: none}
        .table-space {margin-top: 40px}
        .date-border-1 {border-bottom: none}
        .date-border-2 {border-top: none}
        .date {width:200px}
      </style></head><body>
      <div class="gad-report-header">
        <h4>ANNUAL GENDER AND DEVELOPMENT (GAD) PLAN AND BUDGET</h4>
        <h4>FY ${budgetYear}</h4>
      </div>
      <div class="agency">
        <h4><span style="font-weight:200;">Agency/Bureau/Office:</span> Marinduque State University</h4>
        <h4><span style="font-weight:200;">Total GAA of Agency:</span> ${totalGAAFormatted}</h4>
      </div>
      <table>
        <thead><tr>
          <th>No.</th><th>Gender Issue and/or GAD Mandate</th>
          <th>Cause of the Gender Issue</th><th>GAD Result Statement/GAD Objective</th>
          <th>Supporting Statistics Data</th><th>Relevant Agency MFO/PAP</th>
          <th>GAD Activity</th><th>Output Performance Indicators and Target</th>
          <th>GAD Budget</th><th>Source of Budget</th><th>Responsible Unit/Office</th>
        </tr></thead>
        <tbody>
          ${orderedProjects
            .map((project, idx) => {
              const projectTypeLabel = getProjectTypeLabel(project);
              const prevProject = orderedProjects[idx - 1];
              const prevTypeLabel = prevProject
                ? getProjectTypeLabel(prevProject)
                : null;
              const shouldShowTypeHeader =
                idx === 0 || prevTypeLabel !== projectTypeLabel;

              const causeArr = Array.isArray(project.cause_gender_issue)
                ? project.cause_gender_issue
                : [project.cause_gender_issue || ""];
              const objArr = Array.isArray(project.gad_objective)
                ? project.gad_objective
                : [project.gad_objective || ""];
              const actArr = Array.isArray(project.gad_activity)
                ? project.gad_activity
                : [project.gad_activity || ""];
              const perfArr = Array.isArray(
                project.performance_indicator_target,
              )
                ? project.performance_indicator_target
                : [project.performance_indicator_target || ""];
              const maxRows = Math.max(
                causeArr.length,
                objArr.length,
                actArr.length,
                perfArr.length,
              );
              let gadBudgetFormatted = "";
              if (
                !isNaN(Number(project.gad_budget)) &&
                project.gad_budget !== ""
              ) {
                gadBudgetFormatted = Number(project.gad_budget).toLocaleString(
                  undefined,
                  { minimumFractionDigits: 2 },
                );
              }
              const sectionHeader = shouldShowTypeHeader
                ? `<tr class="type-header"><td colspan="11">${projectTypeLabel}</td></tr>`
                : "";

              const projectRows = Array.from({ length: maxRows })
                .map(
                  (_, rowIdx) => `
              <tr>
    ${rowIdx === 0 ? `<td rowspan="${maxRows}">${idx + 1}</td>` : ""}
    ${rowIdx === 0 ? `<td rowspan="${maxRows}">${project.gender_issue || ""}</td>` : ""}

    ${
      causeArr.length === 1
        ? rowIdx === 0
          ? `<td rowspan="${maxRows}">${causeArr[0]}</td>`
          : ""
        : `<td>${causeArr[rowIdx] || ""}</td>`
    }


    ${
      objArr.length === 1
        ? rowIdx === 0
          ? `<td rowspan="${maxRows}">${objArr[0]}</td>`
          : ""
        : `<td>${objArr[rowIdx] || ""}</td>`
    }

    ${rowIdx === 0 ? `<td rowspan="${maxRows}">${project.supporting_statistics_data || ""}</td>` : ""}
    ${rowIdx === 0 ? `<td rowspan="${maxRows}">${project.relevant_agency || ""}</td>` : ""}

   
    ${
      actArr.length === 1
        ? rowIdx === 0
          ? `<td rowspan="${maxRows}">${actArr[0]}</td>`
          : ""
        : `<td>${actArr[rowIdx] || ""}</td>`
    }


    ${
      perfArr.length === 1
        ? rowIdx === 0
          ? `<td rowspan="${maxRows}">${perfArr[0]}</td>`
          : ""
        : `<td>${perfArr[rowIdx] || ""}</td>`
    }

    ${rowIdx === 0 ? `<td rowspan="${maxRows}">${gadBudgetFormatted}</td>` : ""}
    ${rowIdx === 0 ? `<td rowspan="${maxRows}">${project.source_budget || ""}</td>` : ""}
    ${rowIdx === 0 ? `<td rowspan="${maxRows}">${project.responsible_office || ""}</td>` : ""}
  </tr>`,
                )
                .join("");

              return `${sectionHeader}${projectRows}`;
            })
            .join("")}
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
      </table></body></html>`;

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
      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded transition mb-2"
      onClick={handlePrintProjects}
      disabled={totalGAA === null || typeof totalGAA === "undefined"}
    >
      Print Projects
    </button>
  );
}

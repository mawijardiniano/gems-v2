"use client";

export default function PrintGPB({ totalGAA, budgetYear, projects, year }) {
  const handlePrintProjects = () => {
    console.log("Year", budgetYear)
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

    const html = `
      <html><head><title>Projects List</title>
      <style>
        body { font-family: Arial, sans-serif; }
        table { border-collapse: collapse; width: 100%; margin-top: 10px; }
        th, td { border: 1px solid #333; padding: 8px; text-align: left; }
        th { background: #f2f2f2; }
        .gad-report-header { text-align: center; }
        .gad-report-header h4, .agency h4 { margin: 0; }
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
          ${projects
            .map((project, idx) => {
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
              return Array.from({ length: maxRows })
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
            })
            .join("")}
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

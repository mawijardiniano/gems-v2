import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { cacheOrSet } from "@/lib/cache";
import Project from "@/models/projects";
import GPB from "@/models/gpb";
import UniversityOfficial from "@/models/universityOfficials";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const REPORT_CACHE_TTL = 60 * 1000;

function fieldValue(field) {
  if (!field) return "";
  if (typeof field === "object" && !Array.isArray(field) && "value" in field) {
    return field.value ?? "";
  }
  return field;
}

function fieldList(field) {
  const v = fieldValue(field);
  if (Array.isArray(v)) return v.filter(Boolean);
  if (v) return [v];
  return [];
}

function peso(n) {
  return `Php ${Number(n || 0).toLocaleString("en-PH")}`;
}

const PROJECT_TYPE_ORDER = {
  "Client Focused": 0,
  "Organization Focused": 1,
  "Attributed Program": 2,
  Uncategorized: 3,
};

function projectTypeLabel(project) {
  const rawType = project?.project_type;
  const value =
    rawType && typeof rawType === "object" ? rawType.value : rawType;
  if (value === "Client Focused") return "Client Focused";
  if (value === "Organization Focused") return "Organization Focused";
  if (value === "Attributed Program") return "Attributed Program";
  return "Uncategorized";
}

function extractName(userAuth) {
  if (!userAuth) return "";
  const first =
    userAuth?.personal_info_id?.personal?.first_name ||
    userAuth?.first_name ||
    "";
  const middle =
    userAuth?.personal_info_id?.personal?.middle_name ||
    userAuth?.middle_name ||
    "";
  const last =
    userAuth?.personal_info_id?.personal?.last_name ||
    userAuth?.last_name ||
    "";
  const mid = middle
    ? `${middle.toString().trim().charAt(0).toUpperCase()}.`
    : "";
  return [first, mid, last].filter(Boolean).join(" ").trim();
}

const MAIN_TABLE_HEAD = [
  [
    { content: "#", styles: { halign: "center" } },
    "Gender Issue / GAD Mandate\n(1)",
    "Cause of Gender Issue\n(2)",
    "GAD Result Statement / GAD Objective\n(3)",
    "Relevant Organization MFO/PAP or PPA\n(4)",
    "GAD Activity\n(5)",
    "Performance Indicator / Target\n(6)",
    "Actual Result (Outputs/Outcomes)\n(7)",
    "Total Agency Approved Budget\n(8)",
    "Actual Cost Expenditure\n(9)",
    "Responsible Unit/Office\n(10)",
  ],
];

export async function GET(req) {
  try {
    const { error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const url = new URL(req.url);
    const yearParam = url.searchParams.get("year")?.trim();
    if (!yearParam || Number.isNaN(Number(yearParam))) {
      return NextResponse.json(
        { message: "Valid academic year is required." },
        { status: 400 },
      );
    }
    const year = Number(yearParam);

    const result = await cacheOrSet(
      `gad-ar-report:${year}`,
      async () => {
        const projects = await Project.find({ year }).lean();
        if (!projects || projects.length === 0) {
          return {
            __empty: true,
            message: `No GAD projects found for AY ${year}.`,
          };
        }

        const [gpb, officials] = await Promise.all([
          GPB.findOne({ year }).populate("gaaBudgetId").lean(),
          UniversityOfficial.findOne()
            .populate({
              path: ["president.name", "office_of_the_president.name"],
              populate: { path: "personal_info_id" },
            })
            .lean(),
        ]);

        const orderedProjects = [...projects]
          .map((project, originalIndex) => ({ project, originalIndex }))
          .sort((a, b) => {
            const byType =
              PROJECT_TYPE_ORDER[projectTypeLabel(a.project)] -
              PROJECT_TYPE_ORDER[projectTypeLabel(b.project)];
            if (byType !== 0) return byType;
            return a.originalIndex - b.originalIndex;
          })
          .map((entry) => entry.project);

        const generatedAt = new Date();

        const doc = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: "legal",
        });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const M = 10; 
        const usableWidth = pageWidth - 2 * M;

        const totalBudget = orderedProjects.reduce(
          (s, p) => s + (Number(fieldValue(p.gad_budget)) || 0),
          0,
        );
        const totalExpenditures = orderedProjects.reduce(
          (s, p) => s + (Number(p.actual_expenditures) || 0),
          0,
        );
        const gaa = gpb?.gaaBudgetId || null;
        const totalGAA = Number(gaa?.totalGAA) || 0;
        const originalBudget = Number(gaa?.gadAnnualBudget) || 0;
        const hasBudget = Boolean(gaa);
        const totalGAADisplay = hasBudget ? peso(totalGAA) : "To follow";
        const originalBudgetDisplay = hasBudget
          ? peso(originalBudget)
          : "To follow";
        const utilPct =
          originalBudget > 0
            ? ((totalExpenditures / originalBudget) * 100).toFixed(2)
            : "0.00";
        const gadPct =
          totalGAA > 0
            ? ((totalExpenditures / totalGAA) * 100).toFixed(2)
            : "0.00";

        let cursorY = 14;
        doc.setFont("times", "bold");
        doc.setFontSize(13);
        doc.text(
          "ANNUAL GENDER AND DEVELOPMENT (GAD) ACCOMPLISHMENT REPORT",
          pageWidth / 2,
          cursorY,
          { align: "center", charSpace: 0.3 },
        );
        cursorY += 7;
        doc.setFont("times", "normal");
        doc.setFontSize(9);
        doc.text(`FY: ${year}`, pageWidth / 2, cursorY, { align: "center" });
        cursorY += 8;

        const labelStyle = {
          fillColor: [240, 240, 240],
          fontStyle: "bold",
        };
        const gridStyle = {
          font: "times",
          fontSize: 8.5,
          cellPadding: 1.8,
          lineWidth: 0.1,
        };

        autoTable(doc, {
          startY: cursorY,
          margin: { left: M, right: M },
          theme: "grid",
          styles: gridStyle,
          columnStyles: {
            0: { cellWidth: pageWidth / 2 - M },
            1: { cellWidth: pageWidth / 2 - M },
          },
          body: [
            [
              { content: "Reference:", styles: labelStyle },
              { content: "Date Endorsed:", styles: labelStyle },
            ],
            [
              {
                content: "Organization: Marinduque State University",
                styles: labelStyle,
              },
              { content: "Organization Category:", styles: labelStyle },
            ],
            [
              {
                content: "Organization Hierarchy: Marinduque State University",
                colSpan: 2,
                styles: labelStyle,
              },
            ],
            [
              {
                content: `Total Budget/GAA of Organization: ${totalGAADisplay}`,
                colSpan: 2,
                styles: labelStyle,
              },
            ],
          ],
        });

        const budgetY = doc.lastAutoTable.finalY + 2;
        autoTable(doc, {
          startY: budgetY,
          margin: { left: M, right: pageWidth / 2 + 2 },
          theme: "grid",
          styles: { ...gridStyle, minCellHeight: 7 },
          columnStyles: {
            0: { cellWidth: 42 },
            1: { cellWidth: 30, halign: "right" },
            2: { cellWidth: 40 },
            3: { cellWidth: 28, halign: "right" },
          },
          body: [
            [
              { content: "Actual GAD Expenditure", styles: labelStyle },
              peso(totalExpenditures),
              { content: "Original Budget", styles: labelStyle },
              originalBudgetDisplay,
            ],
            [
              "",
              "",
              { content: "% Utilization of Budget", styles: labelStyle },
              `${utilPct}%`,
            ],
            [
              { content: "% of GAD Expenditure:", styles: labelStyle },
              `${gadPct}%`,
              "",
              "",
            ],
          ],
        });
        autoTable(doc, {
          startY: budgetY,
          margin: { left: pageWidth / 2 + 2, right: M },
          theme: "grid",
          styles: { ...gridStyle, minCellHeight: 7 },
          columnStyles: { 0: { cellWidth: pageWidth / 2 - M - 2 } },
          body: [[""], [""], [""]],
        });

        /* MAIN_TABLE */

        const body = [];
        let lastType = null;
        orderedProjects.forEach((project, index) => {
          const typeLabel = projectTypeLabel(project);
          if (typeLabel !== lastType) {
            body.push([
              {
                content: typeLabel,
                colSpan: 11,
                styles: {
                  halign: "center",
                  fontStyle: "bold",
                },
              },
            ]);
            lastType = typeLabel;
          }

          const isAttributedProgram = typeLabel === "Attributed Program";
          const accomplishment = Array.isArray(project.actual_accomplishment)
            ? project.actual_accomplishment.filter(Boolean)
            : [];
          const actualText =
            typeof project.actual_accomplishment === "string"
              ? project.actual_accomplishment
              : accomplishment[0] || "";

          body.push([
            String(index + 1),
            String(fieldValue(project.gender_issue) || ""),
            fieldList(project.cause_gender_issue).join("\n"),
            fieldList(project.gad_objective).join("\n"),
            String(fieldValue(project.relevant_agency) || ""),
            fieldList(project.gad_activity).join("\n"),
            fieldList(project.performance_indicator_target).join("\n"),
            isAttributedProgram ? "" : String(actualText || ""),
            peso(fieldValue(project.gad_budget)),
            project.actual_expenditures
              ? peso(project.actual_expenditures)
              : "",
            String(fieldValue(project.responsible_office) || ""),
          ]);
        });

        body.push([
          {
            content: "TOTAL",
            colSpan: 7,
            styles: {
              halign: "right",
              fontStyle: "bold",
              fillColor: [248, 248, 248],
            },
          },
          {
            content: peso(totalBudget),
            styles: {
              halign: "right",
              fontStyle: "bold",
              fillColor: [248, 248, 248],
            },
          },
          {
            content: peso(totalExpenditures),
            styles: {
              halign: "right",
              fontStyle: "bold",
              fillColor: [248, 248, 248],
            },
          },
          { content: "", styles: { fillColor: [248, 248, 248] } },
        ]);

        autoTable(doc, {
          head: MAIN_TABLE_HEAD.map((row) =>
            row.map((cell) =>
              typeof cell === "string" ? cell.toUpperCase() : cell,
            ),
          ),
          body,
          startY: doc.lastAutoTable.finalY + 6,
          theme: "grid",
          styles: {
            font: "times",
            fontSize: 7.5,
            cellPadding: 1.5,
            valign: "top",
            overflow: "linebreak",
            lineWidth: 0.1,
          },
          headStyles: {
            font: "times",
            fontSize: 7,
            fontStyle: "bold",
            halign: "center",
            valign: "middle",
            fillColor: [240, 240, 240],
            textColor: 0,
          },
          columnStyles: {
            0: { cellWidth: 15.8, halign: "center" },
            1: { cellWidth: 15.8 },
            2: { cellWidth: 35.5 },
            3: { cellWidth: 39.5 },
            4: { cellWidth: 31.6 },
            5: { cellWidth: 39.5 },
            6: { cellWidth: 39.5 },
            7: { cellWidth: 39.5 },
            8: { cellWidth: 23.7, halign: "right" },
            9: { cellWidth: 23.7, halign: "right" },
            10: { cellWidth: 31.6 },
          },
          margin: { left: M, right: M },
        });

        const focalEntry = (officials?.office_of_the_president || []).find(
          (item) =>
            item?.position?.toString().toLowerCase().includes("focal"),
        );
        const focalPointName = extractName(focalEntry?.name);
        const presidentName = extractName(officials?.president?.name);

        let signY = doc.lastAutoTable.finalY + 10;
        if (signY > pageHeight - 70) {
          doc.addPage();
          signY = 20;
        }

        const dateColWidth = 53;
        autoTable(doc, {
          startY: signY,
          margin: { left: M, right: M },
          theme: "grid",
          styles: {
            font: "times",
            fontSize: 8.5,
            lineWidth: 0.1,
            minCellHeight: 8,
          },
          headStyles: {
            font: "times",
            fontSize: 8.5,
            fontStyle: "bold",
            halign: "center",
            fillColor: [240, 240, 240],
            textColor: 0,
          },
          columnStyles: {
            0: { cellWidth: (usableWidth - dateColWidth) / 2 },
            1: { cellWidth: (usableWidth - dateColWidth) / 2 },
            2: { cellWidth: dateColWidth },
          },
          head: [["Prepared By:", "Approved By:", "Date"]],
          body: [
            ["", "", ""],
            [
              {
                content: focalPointName || "____________________________",
                styles: { fontStyle: "bold" },
              },
              {
                content: presidentName || "____________________________",
                styles: { fontStyle: "bold" },
              },
              "",
            ],
            [
              { content: "GAD Focal Point/Person", styles: { fontStyle: "bold" } },
              { content: "University President", styles: { fontStyle: "bold" } },
              "",
            ],
          ],
        });

        const reportDate = `${generatedAt.getMonth() + 1}-${generatedAt.getDate()}-${String(
          generatedAt.getFullYear(),
        ).slice(-2)}`;
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          const barH = 6;
          doc.setFillColor(229, 231, 235);
          doc.rect(0, pageHeight - barH, pageWidth, barH, "F");
          doc.setFont("times", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(0);
          doc.text(
            `Report Generated: ${reportDate}    Page ${i} of ${pageCount}`,
            pageWidth - M,
            pageHeight - 2,
            { align: "right" },
          );
        }

        const pdfArrayBuffer = doc.output("arraybuffer");
        return {
          buffer: Buffer.from(pdfArrayBuffer),
          generatedAt: generatedAt.toISOString(),
        };
      },
      REPORT_CACHE_TTL,
    );

    if (result?.__empty) {
      return NextResponse.json({ message: result.message }, { status: 404 });
    }

    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="gad-accomplishment-report-${year}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("GAD AR generation failed:", err);
    return NextResponse.json(
      { message: "Failed to generate GAD Accomplishment Report." },
      { status: 500 },
    );
  }
}

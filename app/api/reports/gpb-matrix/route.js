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

/* The GAD Activity column stays a single column: each activity prints its
   title with the description on the following line. */
function activityCellText(project) {
  const titles = fieldList(project.gad_activity);
  const descriptions = fieldList(project.gad_activity_description);

  return titles
    .map((title, idx) => {
      const description = descriptions[idx];
      return description ? `${title}\n${description}` : title;
    })
    .join("\n");
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
    "Supporting Statistics Data\n(4)",
    "Relevant Organization MFO/PAP or PPA\n(5)",
    "GAD Activity\n(6)",
    "Performance Indicator / Target\n(7)",
    "GAD Budget\n(8)",
    "Source of Budget\n(9)",
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
      `gpb-matrix-report:${year}`,
      async () => {
        /* Plan fields only — no event/accomplishment populate is needed. */
        const projects = await Project.find({ year }).lean();
        if (!projects || projects.length === 0) {
          return {
            __empty: true,
            message: `No GAD projects found for AY ${year}.`,
          };
        }

        const [gpb, officials] = await Promise.all([
          GPB.findOne({ year }).populate("gaaBudgetId").lean(),
          UniversityOfficial.find()
            .populate({
              path: "name",
              model: "UserAuth",
              populate: { path: "personal_info_id", populate: { path: "personal" } },
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
        const gaa = gpb?.gaaBudgetId || null;
        const totalGAA = Number(gaa?.totalGAA) || 0;
        const totalGAADisplay = gaa
          ? totalGAA.toLocaleString("en-PH", { minimumFractionDigits: 2 })
          : "To follow";

        let cursorY = 14;
        doc.setFont("times", "bold");
        doc.setFontSize(13);
        doc.text(
          "ANNUAL GENDER AND DEVELOPMENT (GAD) PLAN AND BUDGET",
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
            0: { cellWidth: 55 },
            1: { cellWidth: usableWidth - 55 },
          },
          body: [
            [
              { content: "Agency/Bureau/Office:", styles: labelStyle },
              "Marinduque State University",
            ],
            [
              { content: "Total GAA of Agency:", styles: labelStyle },
              totalGAADisplay,
            ],
          ],
        });

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

          body.push([
            String(index + 1),
            String(fieldValue(project.gender_issue) || ""),
            fieldList(project.cause_gender_issue).join("\n"),
            fieldList(project.gad_objective).join("\n"),
            String(fieldValue(project.supporting_statistics_data) || ""),
            String(fieldValue(project.relevant_agency) || ""),
            activityCellText(project),
            fieldList(project.performance_indicator_target).join("\n"),
            peso(fieldValue(project.gad_budget)),
            String(fieldValue(project.source_budget) || ""),
            fieldList(project.responsible_office).join("\n"),
          ]);
        });

        body.push([
          {
            content: "TOTAL",
            colSpan: 8,
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
          { content: "", styles: { fillColor: [248, 248, 248] } },
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
            0: { cellWidth: 12, halign: "center" },
            1: { cellWidth: 34 },
            2: { cellWidth: 38 },
            3: { cellWidth: 38 },
            4: { cellWidth: 30 },
            5: { cellWidth: 30 },
            6: { cellWidth: 38 },
            7: { cellWidth: 34 },
            8: { cellWidth: 22, halign: "right" },
            9: { cellWidth: 26 },
            10: { cellWidth: 33.6 },
          },
          margin: { left: M, right: M },
        });

        const focalEntry = (officials || []).find((item) =>
          item?.position?.toString().toLowerCase().includes("focal"),
        );
        const focalPointName = extractName(focalEntry?.name);
        const presidentName = extractName(
          (officials || []).find((item) => item?.title === "University President")
            ?.name,
        );

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
        "Content-Disposition": `attachment; filename="gpb-matrix-${year}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("GPB matrix generation failed:", err);
    return NextResponse.json(
      { message: "Failed to generate the GPB Plan and Budget matrix." },
      { status: 500 },
    );
  }
}






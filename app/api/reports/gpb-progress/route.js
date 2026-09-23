import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { cacheOrSet } from "@/lib/cache";
import Project from "@/models/projects";
import {
  buildOverallReport,
  buildPerProjectReport,
  buildQuarterBreakdownReport,
  buildQuarterlyReport,
  orderProjectsByType,
} from "@/lib/gpbProgressPdf";

const REPORT_CACHE_TTL = 60 * 1000;

const MODES = ["overall", "project", "quarter", "breakdown"];

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

    const modeParam = (url.searchParams.get("mode") || "overall").trim();
    const mode = MODES.includes(modeParam) ? modeParam : "overall";

    /* Quarterly reports need the quarter the milestones are grouped into. */
    let quarter = null;
    if (mode === "quarter") {
      const quarterParam = Number(
        (url.searchParams.get("quarter") || "").trim(),
      );
      if (![1, 2, 3, 4].includes(quarterParam)) {
        return NextResponse.json(
          {
            message:
              "A valid quarter (1-4) is required for the quarterly report.",
          },
          { status: 400 },
        );
      }
      quarter = quarterParam;
    }

    const result = await cacheOrSet(
      `gpb-progress-report:${year}:${mode}${quarter ? `:q${quarter}` : ""}`,
      async () => {
        /* Milestones are embedded in the project documents, so no extra
           populate is needed for any of the report modes. */
        const projects = await Project.find({ year }).lean();
        if (!projects || projects.length === 0) {
          return {
            __empty: true,
            message: `No GAD projects found for AY ${year}.`,
          };
        }

        const orderedProjects = orderProjectsByType(projects);

        return {
          buffer:
            mode === "breakdown"
              ? buildQuarterBreakdownReport(orderedProjects, year)
              : mode === "quarter"
                ? buildQuarterlyReport(orderedProjects, year, quarter)
                : mode === "project"
                  ? buildPerProjectReport(orderedProjects, year)
                  : buildOverallReport(orderedProjects, year),
        };
      },
      REPORT_CACHE_TTL,
    );

    if (result?.__empty) {
      return NextResponse.json({ message: result.message }, { status: 404 });
    }

    const filename =
      mode === "breakdown"
        ? `gpb-progress-${year}-by-quarter.pdf`
        : mode === "quarter"
          ? `gpb-progress-${year}-q${quarter}.pdf`
          : mode === "project"
            ? `gpb-progress-${year}-per-project.pdf`
            : `gpb-progress-${year}.pdf`;

    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("GPB progress report generation failed:", err);
    return NextResponse.json(
      { message: "Failed to generate the milestone progress report." },
      { status: 500 },
    );
  }
}

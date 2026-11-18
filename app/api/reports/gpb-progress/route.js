import { NextResponse } from "next/server";
import { connectDB } from "@/data/lib/db";
import { requireAuth } from "@/data/lib/auth";
import { canViewGpbReports } from "@/data/lib/roleAccess";
import { cacheOrSet } from "@/data/lib/cache";
import Project from "@/models/projects";
import GPB from "@/models/gpb";
import { parseGpbYear } from "@/data/lib/gpbYear";
import { yearProjectsMatch } from "@/data/lib/yearBudgetSummary";
import {
  buildOverallReport,
  buildPerProjectReport,
  buildQuarterBreakdownReport,
  buildQuarterlyReport,
  orderProjectsByType,
} from "@/data/lib/gpbProgressPdf";

const REPORT_CACHE_TTL = 60 * 1000;

const MODES = ["overall", "project", "quarter", "breakdown"];

export async function GET(req) {
  try {
    const { error, status, user } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });
    /* Milestone reports are for the GPB roles and the President
       (read-only). */
    if (!canViewGpbReports(user?.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const url = new URL(req.url);
    const year = parseGpbYear(url.searchParams.get("year"));
    if (year === null) {
      return NextResponse.json(
        { message: "Valid academic year is required." },
        { status: 400 },
      );
    }

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
           populate is needed for any of the report modes. The projects are
           the GPB's own, as in the matrix report, so the two reports cover
           the same projects. */
        const gpb = await GPB.findOne({ year }).select("projects").lean();
        const projects = await Project.find(
          yearProjectsMatch(gpb, year),
        ).lean();
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

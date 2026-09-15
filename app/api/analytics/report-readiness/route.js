import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { cacheOrSet } from "@/lib/cache";
import { optionalAuth } from "@/lib/auth";
import Project from "@/models/projects";
import Event from "@/models/event";
import AccomplishmentReport from "@/models/accomplishment_report";
import GPB from "@/models/gpb";

const CACHE_TTL = 60 * 1000;

function projectLabel(p) {
  const activities = Array.isArray(p?.gad_activity?.value)
    ? p.gad_activity.value.filter(Boolean)
    : [];
  const issue = p?.gender_issue?.value || "";
  return activities[0] || issue || `Project ${p?._id}`;
}

export async function GET(req) {
  try {
    const { error, status } = await optionalAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const url = new URL(req.url);
    const yearParam = url.searchParams.get("year")?.trim();
    if (!yearParam || Number.isNaN(Number(yearParam))) {
      return NextResponse.json(
        { message: "Valid year is required." },
        { status: 400 },
      );
    }
    const year = Number(yearParam);

    const result = await cacheOrSet(
      `report-readiness:${year}`,
      async () => {
        const projects = await Project.find({ year }).lean();

        const missingAccomplishments = [];
        const missingEvidence = [];

        projects.forEach((p) => {
          const label = projectLabel(p);
          const accomplishment = Array.isArray(p.actual_accomplishment)
            ? p.actual_accomplishment.filter(Boolean)
            : [];
          if (accomplishment.length === 0) {
            missingAccomplishments.push({ id: p._id, label });
          }
          if (
            Number(p.actual_expenditures) > 0 &&
            (!Array.isArray(p.expenditure_evidence) ||
              p.expenditure_evidence.length === 0)
          ) {
            missingEvidence.push({ id: p._id, label });
          }
        });

        const projectIds = projects.map((p) => p._id);
        const completedEvents = await Event.find(
          { project: { $in: projectIds }, status: "completed" },
          { title: 1, project: 1 },
        ).lean();

        const eventIds = completedEvents.map((e) => e._id);
        const reports = await AccomplishmentReport.find(
          { event_id: { $in: eventIds } },
          { event_id: 1 },
        ).lean();
        const reportedEventIds = new Set(
          reports.map((r) => String(r.event_id)),
        );
        const missingReports = completedEvents
          .filter((e) => !reportedEventIds.has(String(e._id)))
          .map((e) => ({ id: e._id, label: e.title || "Untitled event" }));

        const gpb = await GPB.findOne({ year }).lean();

        return {
          year,
          gpbStatus: gpb?.status_of_gpb?.status || null,
          projects: {
            total: projects.length,
            missingAccomplishments,
            missingEvidence,
          },
          events: {
            completed: completedEvents.length,
            missingReports,
          },
        };
      },
      CACHE_TTL,
    );

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("report-readiness failed:", err);
    return NextResponse.json(
      { message: "Failed to load report readiness." },
      { status: 500 },
    );
  }
}

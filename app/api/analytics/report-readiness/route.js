import { NextResponse } from "next/server";
import { connectDB } from "@/data/lib/db";
import { cacheOrSet } from "@/data/lib/cache";
import { requireAuth } from "@/data/lib/auth";
import { canViewProjectDetails } from "@/data/lib/projectAccess";
import Project from "@/models/projects";
import Event from "@/models/event";
import { effectiveStatus } from "@/data/lib/eventStatus";
import AccomplishmentReport from "@/models/accomplishment_report";
import GPB from "@/models/gpb";
import {
  normalizeAccomplishmentLines,
  usesAccomplishmentOverride,
} from "@/data/lib/accomplishmentSummary";

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
    /* Project titles and events missing reports are for the GAD roles that
       read the dashboard and Reports pages; this answered anonymous callers. */
    const { error, status, user } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });
    if (!canViewProjectDetails(user.role)) {
      return NextResponse.json(
        { error: "You are not allowed to view report readiness." },
        { status: 403 },
      );
    }

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
        const projectIds = projects.map((p) => p._id);

        /* Active (non-cancelled) linked events make a project "accomplished" automatically,
           since the accomplishment text is derived live from those events. */
        const activeEventCounts = await Event.aggregate([
          {
            $match: {
              project: { $in: projectIds },
              status: { $ne: "cancelled" },
            },
          },
          { $group: { _id: "$project", count: { $sum: 1 } } },
        ]);
        const activeEventMap = new Map(
          activeEventCounts.map((row) => [String(row._id), row.count]),
        );

        const missingAccomplishments = [];
        const missingEvidence = [];

        projects.forEach((p) => {
          const label = projectLabel(p);
          const hasEvents = (activeEventMap.get(String(p._id)) || 0) > 0;
          const hasCustomText =
            usesAccomplishmentOverride(p) &&
            normalizeAccomplishmentLines(p.actual_accomplishment).length > 0;

          if (!hasEvents && !hasCustomText) {
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

        /* Completed by date, not only by the stored flag: an event that
           ended but was never marked completed was never flagged as missing
           its report. Dates are loaded so effectiveStatus can decide. */
        const linkedEvents = await Event.find(
          { project: { $in: projectIds }, status: { $ne: "cancelled" } },
          {
            title: 1,
            project: 1,
            status: 1,
            start_date: 1,
            end_date: 1,
            start_dates: 1,
            end_dates: 1,
            date: 1,
          },
        ).lean();
        const completedEvents = linkedEvents.filter(
          (e) => effectiveStatus(e) === "completed",
        );

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

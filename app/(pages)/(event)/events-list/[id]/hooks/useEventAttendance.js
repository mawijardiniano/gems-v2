"use client";

import { useMemo } from "react";
import { computeInsights } from "@/data/lib/eventInsights";
import { extractGuestDetails } from "../lib/guestDetails";

const asList = (value) => (Array.isArray(value) ? value : []);
const isApproved = (g) =>
  !g?.validation_status || g.validation_status === "approved";

/* Everything derived from the two attendance stores — Event.attended_users
   (signed-in QR check-ins) and the guest sheet (EventGuest rows) — for the
   Attendance table, the Overview tiles, Insights and the report. One person
   counts once even when they appear in both. */
export function useEventAttendance(event, guests) {
  /* Ids of accounts already present in the guest sheet. A manual encode writes
     an EventGuest row, so the same person can sit in both attended_users (their
     QR check-in) and the sheet (the organizer's record). */
  const guestUserIds = useMemo(() => {
    const ids = new Set();
    asList(guests).forEach((g) => {
      if (g?.user_id) ids.add(String(g.user_id));
    });
    return ids;
  }, [guests]);

  /* Profiles of attendees with an account that the guest sheet does not
     already cover — one per person, so a repeated scan cannot inflate a count. */
  const attendedProfiles = useMemo(() => {
    const seen = new Set();
    return asList(event?.attended_users)
      .filter((a) => {
        const id = a?.user_id?._id ?? a?.user_id;
        return Boolean(id) && !guestUserIds.has(String(id));
      })
      .map((a) => a?.user_id?.personal_info_id)
      .filter((p) => {
        if (!p) return false;
        const key = String(p?._id ?? p);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [event, guestUserIds]);

  /* Approved guest check-ins (legacy rows without a status count as approved). */
  const approvedGuests = useMemo(
    () => asList(guests).filter(isApproved),
    [guests],
  );

  /* A QR check-in by somebody with an account writes Event.attended_users and
     no guest row, so those people are turned into approved table rows here,
     with the same column shape a guest row has. Keys carry a `checkin:` prefix
     so they never collide with an EventGuest _id, and accounts already covered
     by the sheet are skipped. */
  const checkinGuestRows = useMemo(
    () =>
      asList(event?.attended_users)
        .map((entry) => ({ entry, user: entry?.user_id }))
        .filter(({ user }) => user && (user._id || user.personal_info_id))
        .filter(({ user }) => {
          const accountId = user?._id ?? user?.user_id;
          if (accountId && guestUserIds.has(String(accountId))) return false;
          if (user?.personal_info_id) {
            const pid = String(
              user.personal_info_id?._id ?? user.personal_info_id,
            );
            if (guestUserIds.has(pid)) return false;
          }
          return true;
        })
        .map(({ entry, user }) => {
          const details = extractGuestDetails(user);
          return {
            _id: `checkin:${user?._id ?? user?.personal_info_id}`,
            full_name: details.name,
            sex: details.sex,
            age: details.age,
            participant_type: details.status,
            /* Full college / office name, like every other row on the sheet.
               The acronym (`details.department`) made these rows the odd
               ones out and mangled names with an apostrophe
               ("Registrar's Office" → "RSO"). */
            department_office_org:
              details.office || details.college || details.department,
            program_year_section: details.programYearSection,
            position_designation: details.positionDesignation,
            contact: details.contact,
            attended_at: entry?.attended_at || null,
            validation_status: "approved",
            source: "account-check-in",
            validation_note:
              "Recorded automatically from a signed-in QR check-in",
          };
        }),
    [event, guestUserIds],
  );

  /* What the Attendance table renders: every guest row plus the QR-only
     account check-ins, approved first so a fresh record is on page one. */
  const attendanceGuests = useMemo(() => {
    const score = (g) => (isApproved(g) ? 0 : 1);
    const time = (g) => new Date(g?.attended_at || 0).getTime() || 0;
    return [...asList(guests), ...checkinGuestRows].sort(
      (a, b) => score(a) - score(b) || time(b) - time(a),
    );
  }, [guests, checkinGuestRows]);

  /* The arithmetic lives in lib/eventInsights so it can be tested. */
  const insights = useMemo(
    () => computeInsights(attendedProfiles, approvedGuests),
    [attendedProfiles, approvedGuests],
  );

  /* Students, Employees and Stakeholders from both sources. */
  const statusCounts = useMemo(() => {
    const counts = {};
    attendedProfiles.forEach((p) => {
      const status =
        p?.affiliation?.person_type || p?.personal?.currentStatus || "Unknown";
      counts[status] = (counts[status] || 0) + 1;
    });
    approvedGuests.forEach((g) => {
      const status = g?.participant_type || "Unknown";
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [attendedProfiles, approvedGuests]);

  return {
    attendanceGuests,
    insights,
    statusCounts,
    /* The donut reads 0/0 for a brand-new event; Insights shows an empty
       state instead. */
    hasInsightData: insights.attendedCount > 0,
    /* ReportTab wants the guest sheet size on its own. */
    approvedGuestCount: approvedGuests.length,
    pendingGuestCount: asList(guests).filter(
      (g) => g?.validation_status === "pending",
    ).length,
  };
}

/* Pure helpers for the events dashboard (academic-year bucketing, the
   compact peso format, sample-data impact figures). */

import { academicYearStartOf } from "@/data/lib/academicYear";

export function academicYearLabel(year) {
  const y = Number(year);
  return y ? `${y}-${y + 1}` : "";
}

/* AY of the event's start day, as a Manila day (data/lib/academicYear). */
export function eventAcademicYearStart(event) {
  const raw =
    event?.start_date || (Array.isArray(event?.start_dates) ? event.start_dates[0] : null);
  if (!raw) return null;
  return academicYearStartOf(raw);
}

export function fmtPesoCompact(value) {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1000000) return `₱${(n / 1000000).toFixed(1)}M`;
  /* The K branch dropped the peso sign ("150K" next to "₱1.2M"). */
  if (Math.abs(n) >= 1000) return `₱${(n / 1000).toFixed(0)}K`;
  return `₱${n.toFixed(0)}`;
}

/** Female share + lowest-participation groups from sample dashboard payload. */
export function sampleImpactStats(sampleData) {
  if (!sampleData) return null;
  const snap = sampleData.snapshot || {};
  const total = Number(snap.total) || 0;
  const female = Number(snap.femaleCount) || 0;
  const male = Number(snap.maleCount) || 0;
  const femalePct = total > 0 ? Math.round((female / total) * 100) : null;

  const groups = [];
  const collect = (rows, kind) => {
    (rows || []).forEach((row) => {
      const f = Number(row.Female) || 0;
      const m = Number(row.Male) || 0;
      const t = f + m;
      if (t < 10) return;
      groups.push({ name: row.name, kind, femalePct: Math.round((f / t) * 100), total: t });
    });
  };
  collect(sampleData.demographics?.studentCollegeData, "college");
  collect(sampleData.demographics?.employeeOfficeData, "office");
  groups.sort((a, b) => a.femalePct - b.femalePct);
  const gaps = groups.filter((g) => g.femalePct < 40).slice(0, 4);

  return { total, female, male, femalePct, gaps };
}


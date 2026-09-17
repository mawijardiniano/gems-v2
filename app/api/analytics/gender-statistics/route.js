import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { cacheOrSet } from "@/lib/cache";
import { optionalAuth } from "@/lib/auth";
import GemsProfile from "@/models/profile";
import ProfileTerm from "@/models/profileTerm";

const CACHE_TTL = 60 * 1000;

function sexBucket(profile) {
  const sex = profile?.gadData?.sexAtBirth;
  if (sex === "Male") return "Male";
  if (sex === "Female") return "Female";
  return "Other";
}

function emptyCounts() {
  return { Female: 0, Male: 0, Other: 0, total: 0 };
}

function addCounts(bucket, sex) {
  bucket[sex] = (bucket[sex] || 0) + 1;
  bucket.total += 1;
}

function toList(countsObj, nameKey) {
  return Object.entries(countsObj)
    .map(([name, c]) => ({
      [nameKey]: name,
      Female: c.Female || 0,
      Male: c.Male || 0,
      Other: c.Other || 0,
      total: c.total || 0,
      pctFemale: c.total ? Math.round(((c.Female || 0) / c.total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

const STUDENT_TYPE_FILTERS = {
  Scholar: {
    "affiliation.academic_information.isScholar": {
      $exists: true,
      $nin: [null, "", "No", "no", false],
    },
  },
  "Person with Disability (PWD)": { "gadData.isPWD": true },
  "Indigenous Peoples (IP)": { "gadData.isIndigenousPerson": true },
  "Low Income": { "gadData.socioEconomicStatus": "Low Income" },
  "Middle Income": { "gadData.socioEconomicStatus": "Middle Income" },
  "High Income": { "gadData.socioEconomicStatus": "High Income" },
};

const STUDENT_TYPES = Object.keys(STUDENT_TYPE_FILTERS);

const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

const DEMOGRAPHIC_ROWS = [
  {
    label: "Scholar",
    test: (p) => {
      const v = p?.affiliation?.academic_information?.isScholar;
      return v && String(v).toLowerCase() !== "no";
    },
  },
  {
    label: "Person with Disability (PWD)",
    test: (p) => p?.gadData?.isPWD === true,
  },
  {
    label: "Indigenous Peoples (IP)",
    test: (p) => p?.gadData?.isIndigenousPerson === true,
  },
  {
    label: "Low Income",
    test: (p) => p?.gadData?.socioEconomicStatus === "Low Income",
  },
  {
    label: "Middle Income",
    test: (p) => p?.gadData?.socioEconomicStatus === "Middle Income",
  },
  {
    label: "High Income",
    test: (p) => p?.gadData?.socioEconomicStatus === "High Income",
  },
];

function buildDemographics(profiles, sexOf) {
  return DEMOGRAPHIC_ROWS.map((row) => {
    const counts = emptyCounts();
    profiles.forEach((p) => {
      if (row.test(p)) addCounts(counts, sexOf(p));
    });
    return {
      label: row.label,
      Female: counts.Female,
      Male: counts.Male,
      Other: counts.Other,
      total: counts.total,
    };
  });
}

function orderIndex(order, value) {
  const idx = order.indexOf(value);
  return idx === -1 ? order.length : idx;
}

/* The six student type categories as table rows - the same tests as the
   demographics table, exposed as a filterable breakdown. */
function buildStudentTypes(profiles, sexOf) {
  return DEMOGRAPHIC_ROWS.map((row) => {
    const counts = emptyCounts();
    profiles.forEach((p) => {
      if (row.test(p)) addCounts(counts, sexOf(p));
    });
    return {
      type: row.label,
      Female: counts.Female,
      Male: counts.Male,
      Other: counts.Other,
      total: counts.total,
      pctFemale: counts.total
        ? Math.round((counts.Female / counts.total) * 1000) / 10
        : 0,
    };
  });
}

function buildStats(profiles, type) {
  const sexOf = (p) => sexBucket(p);
  const totals = emptyCounts();
  profiles.forEach((p) => addCounts(totals, sexOf(p)));

  const isStudent = type === "students";

  const groupKey = isStudent
    ? (p) => p?.affiliation?.academic_information?.college || "Unspecified"
    : (p) => p?.affiliation?.employment_information?.office || "Unspecified";

  const byGroupCounts = {};
  profiles.forEach((p) => {
    const key = groupKey(p);
    if (!byGroupCounts[key]) byGroupCounts[key] = emptyCounts();
    addCounts(byGroupCounts[key], sexOf(p));
  });
  const byGroup = toList(byGroupCounts, isStudent ? "college" : "office").filter(
    (r) => (isStudent ? r.college : r.office) !== "Unspecified",
  );

  let byProgram = [];
  let byLevel = [];
  let byYearLevel = [];
  let byStudentType = [];
  let byAppointment = [];
  let byEmploymentStatus = [];

  if (isStudent) {
    const programCounts = {};
    profiles.forEach((p) => {
      const key = p?.affiliation?.academic_information?.course || "Unspecified";
      if (!programCounts[key]) programCounts[key] = emptyCounts();
      addCounts(programCounts[key], sexOf(p));
    });
    byProgram = toList(programCounts, "program")
      .filter((r) => r.program !== "Unspecified")
      .slice(0, 10);

    const levelCounts = {};
    profiles.forEach((p) => {
      const college = p?.affiliation?.academic_information?.college || "";
      const course = p?.affiliation?.academic_information?.course || "";
      const yearLevel = p?.affiliation?.academic_information?.year_level || "";
      const isGraduate =
        college === "Graduate School" || /graduate/i.test(college);
      const isDoctoral = /doctor/i.test(course) || /doctor/i.test(yearLevel);
      const isMasters =
        !isDoctoral &&
        (isGraduate || /master/i.test(course) || /master/i.test(yearLevel));
      const key = isDoctoral
        ? "Graduate (Doctoral)"
        : isMasters
          ? "Graduate (Masters)"
          : "Undergraduate";
      if (!levelCounts[key]) levelCounts[key] = emptyCounts();
      addCounts(levelCounts[key], sexOf(p));
    });
    byLevel = toList(levelCounts, "level");

    const yearLevelCounts = {};
    profiles.forEach((p) => {
      const key = p?.affiliation?.academic_information?.year_level || "";
      if (!key) return;
      if (!yearLevelCounts[key]) yearLevelCounts[key] = emptyCounts();
      addCounts(yearLevelCounts[key], sexOf(p));
    });
    byYearLevel = toList(yearLevelCounts, "year_level").sort(
      (a, b) =>
        orderIndex(YEAR_LEVELS, a.year_level) -
          orderIndex(YEAR_LEVELS, b.year_level) || b.total - a.total,
    );

    byStudentType = buildStudentTypes(profiles, sexOf);
  } else {
    const appointmentCounts = {};
    profiles.forEach((p) => {
      const key =
        p?.affiliation?.employment_information?.employment_appointment_status ||
        "Unspecified";
      if (!appointmentCounts[key]) appointmentCounts[key] = emptyCounts();
      addCounts(appointmentCounts[key], sexOf(p));
    });
    byAppointment = toList(appointmentCounts, "status");

    const statusCounts = {};
    profiles.forEach((p) => {
      const key =
        p?.affiliation?.employment_information?.employment_status || "Unspecified";
      if (!statusCounts[key]) statusCounts[key] = emptyCounts();
      addCounts(statusCounts[key], sexOf(p));
    });
    byEmploymentStatus = toList(statusCounts, "status");
  }

  return {
    type,
    totals: {
      Female: totals.Female,
      Male: totals.Male,
      Other: totals.Other,
      total: totals.total,
      pctFemale: totals.total ? Math.round((totals.Female / totals.total) * 1000) / 10 : 0,
      pctMale: totals.total ? Math.round((totals.Male / totals.total) * 1000) / 10 : 0,
      pctOther: totals.total ? Math.round((totals.Other / totals.total) * 1000) / 10 : 0,
    },
    [isStudent ? "byCollege" : "byOffice"]: byGroup,
    ...(isStudent
      ? { byProgram, byLevel, byYearLevel, byStudentType }
      : { byAppointment, byEmploymentStatus }),
    demographics: buildDemographics(profiles, sexOf),
  };
}


async function buildByAcademicYear(baseProfiles, sexOf) {
  const profilesById = new Map(
    baseProfiles.map((p) => [String(p._id), p]),
  );
  const terms = await ProfileTerm.find(
    {},
    { profile_id: 1, school_year: 1 },
  ).lean();

  const perYear = {};
  for (const t of terms) {
    const p = profilesById.get(String(t.profile_id));
    if (!p) continue;
    const sy = t.school_year || "Unknown";
    if (!perYear[sy]) perYear[sy] = { counts: emptyCounts(), seen: new Set() };
    const id = String(t.profile_id);
    if (perYear[sy].seen.has(id)) continue;
    perYear[sy].seen.add(id);
    addCounts(perYear[sy].counts, sexOf(p));
  }

  return Object.entries(perYear)
    .map(([school_year, v]) => ({
      school_year,
      Female: v.counts.Female,
      Male: v.counts.Male,
      Other: v.counts.Other,
      total: v.counts.total,
    }))
    .sort((a, b) => a.school_year.localeCompare(b.school_year));
}

export async function GET(req) {
  try {
    const { error, status } = await optionalAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const url = new URL(req.url);
    const type =
      url.searchParams.get("type") === "employees" ? "employees" : "students";
    const campus = url.searchParams.get("campus")?.trim();
    const college = url.searchParams.get("college")?.trim();
    const course = url.searchParams.get("course")?.trim();
    const personnelType = url.searchParams.get("personnel_type")?.trim();
    const appointmentStatus = url.searchParams.get("appointment_status")?.trim();
    const schoolYear = url.searchParams.get("school_year")?.trim();
    const semester = url.searchParams.get("semester")?.trim();
    const yearLevel = url.searchParams.get("year_level")?.trim();
    const studentType = url.searchParams.get("student_type")?.trim();

    const cacheKey = `gender-statistics:${type}:${campus || "all"}:${college || "all"}:${course || "all"}:${personnelType || "all"}:${appointmentStatus || "all"}:${schoolYear || "all"}:${semester || "all"}:${yearLevel || "all"}:${studentType || "all"}`;

    const result = await cacheOrSet(
      cacheKey,
      async () => {
        const match = {
          "personal.currentStatus":
            type === "employees" ? "Employee" : "Student",
        };
        if (campus) match["affiliation.academic_information.campus"] = campus;
        if (type === "students" && college)
          match["affiliation.academic_information.college"] = college;
        if (type === "employees" && college)
          match["affiliation.employment_information.office"] = college;
        if (type === "employees" && personnelType)
          match["affiliation.employment_information.employment_status"] =
            personnelType;
        if (type === "employees" && appointmentStatus)
          match[
            "affiliation.employment_information.employment_appointment_status"
          ] = appointmentStatus;
        if (course) match["affiliation.academic_information.course"] = course;
        if (type === "students" && yearLevel) {
          match["affiliation.academic_information.year_level"] = yearLevel;
        }
        if (type === "students" && studentType && STUDENT_TYPE_FILTERS[studentType]) {
          Object.assign(match, STUDENT_TYPE_FILTERS[studentType]);
        }

        const baseProfiles = await GemsProfile.find(match).lean();

        let profiles = baseProfiles;
        if (schoolYear || semester) {
          const termFilter = {};
          if (schoolYear) termFilter.school_year = schoolYear;
          if (semester) termFilter.semester = semester;
          const terms = await ProfileTerm.find(termFilter, {
            profile_id: 1,
          }).lean();
          const idSet = new Set(terms.map((t) => String(t.profile_id)));
          profiles = baseProfiles.filter((p) => idSet.has(String(p._id)));
        }

        const stats = buildStats(profiles, type);
        const schoolYears = (
          await ProfileTerm.distinct("school_year")
        ).filter(Boolean).sort().reverse();

        const semesterList = schoolYear
          ? await ProfileTerm.distinct("semester", { school_year: schoolYear })
          : await ProfileTerm.distinct("semester");
        const semesters =
          type === "students"
            ? ["1st", "2nd", "Summer"].filter((s) => semesterList.includes(s))
            : [];

        const byAcademicYear =
          type === "students"
            ? await buildByAcademicYear(baseProfiles, sexBucket)
            : [];

        return {
          ...stats,
          schoolYears,
          semesters,
          byAcademicYear,
          yearLevels: YEAR_LEVELS,
          studentTypes: STUDENT_TYPES,
        };
      },
      CACHE_TTL,
    );

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("gender-statistics failed:", err);
    return NextResponse.json(
      { message: "Failed to load gender statistics." },
      { status: 500 },
    );
  }
}


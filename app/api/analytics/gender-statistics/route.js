import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { cacheOrSet } from "@/lib/cache";
import { optionalAuth } from "@/lib/auth";
import { canViewPII, resolvePiiBatch, applyRowPii } from "@/lib/profileBroker";
import GemsProfile from "@/models/profile";
import ProfileTerm from "@/models/profileTerm";
import { AGE_GROUP_ORDER, ageGroupOf, parseListParam } from "@/app/(pages)/(event)/gender-statistics/components/ageGroups.js";

const CACHE_TTL = 60 * 1000;

function sexBucket(profile) {
  const sex = profile?.gadData?.sexAtBirth;
  if (sex === "Male") return "Male";
  if (sex === "Female") return "Female";
  /* sexAtBirth is only ever Male or Female in the schema, so this bucket means
     "not recorded". The gender-statistics pages no longer show it, but the
     endpoint keeps counting it so the totals stay complete. */
  return "Other";
}

/*
 * A statistically unusable bucket, and how it comes about: once the vault is
 * the source of identity, a profile whose PII has not been migrated yet (or
 * whose vault read failed) has no sex on this row at all. `sexBucket` maps
 * that to "Other" and the row silently inflates Other while deflating both
 * Female and Male — a wrong GPB headline with nothing in the response to show
 * for it. `sexIsKnown` lets the builders count those rows separately so the
 * caller can tell "genuinely not recorded" from "identity missing".
 */
function sexIsKnown(profile) {
  const sex = profile?.gadData?.sexAtBirth;
  return sex === "Male" || sex === "Female";
}

/* The gender-identity values the schema allows in gadData.gender_preference. */
const GENDER_IDENTITY_ORDER = ["Male", "Female", "LGBTQIA+"];

function genderIdentityRows(profiles = []) {
  const counts = new Map(GENDER_IDENTITY_ORDER.map((name) => [name, 0]));
  let unspecified = 0;
  profiles.forEach((p) => {
    const value = p?.gadData?.gender_preference;
    if (counts.has(value)) counts.set(value, counts.get(value) + 1);
    else unspecified += 1;
  });
  const rows = GENDER_IDENTITY_ORDER.map((name) => ({
    name,
    value: counts.get(name),
  }));
  if (unspecified > 0) rows.push({ name: "Not specified", value: unspecified });
  return rows;
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
    /* Solo parent is not captured in the database yet, so this row reads 0 in
       live mode. It is kept in the list so the demographic table has the same
       rows in live and sample data (the sample dataset seeds it). */
    label: "Solo Parent",
    test: () => false,
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
  /* Rows whose identity did not resolve — see sexIsKnown. Reported, never
     silently folded into "Other". */
  let unresolvedSex = 0;
  profiles.forEach((p) => {
    if (!sexIsKnown(p)) unresolvedSex += 1;
    addCounts(totals, sexOf(p));
  });

  const isStudent = type === "students";
  const lgbtqia = profiles.filter(
    (p) => p?.gadData?.gender_preference === "LGBTQIA+",
  ).length;

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

  const ageCounts = {};
  profiles.forEach((p) => {
    const key = ageGroupOf({ birthday: p?.personal?.birthday });
    if (!key) return;
    if (!ageCounts[key]) ageCounts[key] = emptyCounts();
    addCounts(ageCounts[key], sexOf(p));
  });
  const byAgeGroup = toList(ageCounts, "age_group").sort(
    (a, b) =>
      orderIndex(AGE_GROUP_ORDER, a.age_group) -
      orderIndex(AGE_GROUP_ORDER, b.age_group),
  );

  return {
    type,
    byAgeGroup,
    totals: {
      Female: totals.Female,
      Male: totals.Male,
      Other: totals.Other,
      total: totals.total,
      /* Non-zero means the identity did not resolve for this many rows, so
         the Female/Male split understates them. Surfaced because a report
         built on it would otherwise look complete. */
      unresolvedSex,
      pctFemale: totals.total ? Math.round((totals.Female / totals.total) * 1000) / 10 : 0,
      pctMale: totals.total ? Math.round((totals.Male / totals.total) * 1000) / 10 : 0,
      pctOther: totals.total ? Math.round((totals.Other / totals.total) * 1000) / 10 : 0,
      lgbtqia,
      pctLgbtqia: totals.total
        ? Math.round((lgbtqia / totals.total) * 1000) / 10
        : 0,
    },
    [isStudent ? "byCollege" : "byOffice"]: byGroup,
    ...(isStudent
      ? { byProgram, byLevel, byYearLevel, byStudentType }
      : { byAppointment, byEmploymentStatus }),
    byGenderIdentity: genderIdentityRows(profiles),
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
    const { error, status, user } = await optionalAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const url = new URL(req.url);
    const type =
      url.searchParams.get("type") === "employees" ? "employees" : "students";
    /* Multi-select filters arrive comma-joined (e.g. "1st,2nd"); single values
       still parse to a one-item list so old callers keep working. */
    const campuses = parseListParam(url.searchParams.get("campus"));
    const colleges = parseListParam(url.searchParams.get("college"));
    const courses = parseListParam(url.searchParams.get("course"));
    const semesters = parseListParam(url.searchParams.get("semester"));
    const yearLevels = parseListParam(url.searchParams.get("year_level"));
    const personnelTypes = parseListParam(url.searchParams.get("personnel_type"));
    const appointmentStatuses = parseListParam(
      url.searchParams.get("appointment_status"),
    );
    const schoolYear = url.searchParams.get("school_year")?.trim();
    const studentType = url.searchParams.get("student_type")?.trim();
    /* Scholar is an academic field, so it only applies to students. Solo Parent
       has no database field and is never offered live. */
    const demographicOptions =
      type === "students"
        ? STUDENT_TYPES
        : STUDENT_TYPES.filter((t) => t !== "Scholar");
    const demographics = parseListParam(
      url.searchParams.get("demographic"),
    ).filter((d) => demographicOptions.includes(d));

    const sexes = parseListParam(url.searchParams.get("sex")).filter((s) =>
      ["Female", "Male"].includes(s),
    );
    const ageGroups = parseListParam(url.searchParams.get("age_group")).filter(
      (g) => AGE_GROUP_ORDER.includes(g),
    );
    /* Bands are relative to today, so the day belongs in the cache key. */
    const today = new Date().toISOString().slice(0, 10);

    const keyOf = (list) => [...list].sort().join("+") || "all";
    const accessible = canViewPII(user?.role);
    /* The response depends on the role... except it must not. This route
       returns counts only — no name, no birthday, no contact — so masked and
       revealed produce identical output. `role` is deliberately NOT in the
       cache key for that reason (unlike the list and dashboard routes, where
       the row payload differs). If a future change ever puts an identity field
       in this response, this key has to gain the role too. */
    const cacheKey = `gender-statistics:${type}:${keyOf(campuses)}:${keyOf(colleges)}:${keyOf(courses)}:${keyOf(personnelTypes)}:${keyOf(appointmentStatuses)}:${schoolYear || "all"}:${keyOf(semesters)}:${keyOf(yearLevels)}:${studentType || "all"}:${keyOf(sexes)}:${keyOf(ageGroups)}:${ageGroups.length ? today : "-"}:${keyOf(demographics)}`;

    const result = await cacheOrSet(
      cacheKey,
      async () => {
        const match = {
          "affiliation.person_type":
            type === "employees" ? "Employee" : "Student",
        };
        if (campuses.length)
          match["affiliation.academic_information.campus"] = { $in: campuses };
        if (type === "students" && colleges.length)
          match["affiliation.academic_information.college"] = { $in: colleges };
        if (type === "employees" && colleges.length)
          match["affiliation.employment_information.office"] = { $in: colleges };
        if (type === "employees" && personnelTypes.length)
          match["affiliation.employment_information.employment_status"] = {
            $in: personnelTypes,
          };
        if (type === "employees" && appointmentStatuses.length)
          match[
            "affiliation.employment_information.employment_appointment_status"
          ] = { $in: appointmentStatuses };
        if (courses.length)
          match["affiliation.academic_information.course"] = { $in: courses };
        if (type === "students" && yearLevels.length) {
          match["affiliation.academic_information.year_level"] = {
            $in: yearLevels,
          };
        }
        if (type === "students" && studentType && STUDENT_TYPE_FILTERS[studentType]) {
          Object.assign(match, STUDENT_TYPE_FILTERS[studentType]);
        }

        if (demographics.length) {
          /* Any selected category matches; $and keeps it apart from the age $or. */
          match.$and = [
            {
              $or: demographics.map((d) => STUDENT_TYPE_FILTERS[d]),
            },
          ];
        }
        if (sexes.length) match["gadData.sexAtBirth"] = { $in: sexes };
        /* Age bands cannot be filtered here: the birthday is encrypted in the
           vault. They are applied in memory after the vault read, below.
           A `$or` used to sit on this query for exactly that filter — it is
           gone, and leaving a stale one would silently widen the match. */

        /* Identity is never named in the projection: the route needs counts,
           and reading the columns would both defeat the vault and break the
           moment they are stripped. */
        const baseProfiles = await GemsProfile.find(match).lean();

        /* One vault read for the whole result set, then each row is given the
           masked or revealed shape by role. buildStats keeps only gender and
           age, so masked and revealed produce identical counts here — the
           role is passed anyway so the broker, not the route, decides. */
        const piiByRef = await resolvePiiBatch({
          vaultRefs: baseProfiles.map((p) => p.vaultRef),
          role: user?.role,
        });

        let profiles = baseProfiles.map((p) => {
          const identity = applyRowPii(
            {
              personal: p.personal || {},
              gadData: p.gadData || {},
              contact: p.contact || {},
              /* Needed by `applyRowPii` to resolve `person_type`: without it
                 the status reads empty and every row falls into the wrong
                 student/employee bucket. */
              affiliation: p.affiliation || {},
            },
            piiByRef.get(String(p.vaultRef || "")),
          );
          return {
            ...p,
            personal: identity.personal,
            gadData: identity.gadData,
            affiliation: identity.affiliation || p.affiliation,
          };
        });

        if (schoolYear || semesters.length) {
          const termFilter = {};
          if (schoolYear) termFilter.school_year = schoolYear;
          if (semesters.length) termFilter.semester = { $in: semesters };
          const terms = await ProfileTerm.find(termFilter, {
            profile_id: 1,
          }).lean();
          const idSet = new Set(terms.map((t) => String(t.profile_id)));
          profiles = profiles.filter((p) => idSet.has(String(p._id)));
        }

        /* Age bands are relative to today and computed from the vault birthday,
           so the filter runs here rather than in the query. */
        if (ageGroups.length) {
          const wanted = new Set(ageGroups);
          profiles = profiles.filter((p) =>
            wanted.has(ageGroupOf({ birthday: p?.personal?.birthday })),
          );
        }

        const stats = buildStats(profiles, type);
        const schoolYears = (
          await ProfileTerm.distinct("school_year")
        ).filter(Boolean).sort().reverse();

        const semesterList = schoolYear
          ? await ProfileTerm.distinct("semester", { school_year: schoolYear })
          : await ProfileTerm.distinct("semester");
        const semesterOptions =
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
          semesters: semesterOptions,
          byAcademicYear,
          yearLevels: YEAR_LEVELS,
          ageGroups: AGE_GROUP_ORDER,
          sexes: ["Female", "Male"],
          studentTypes: STUDENT_TYPES,
          demographicOptions,
          /* Whether this caller may be shown identities, and whether the
             figures were computed from the vault or from the legacy columns.
             The route returns aggregates only, so these change no number —
             they let the screen say where a figure came from instead of
             leaving a silent zero to be discovered in a GPB submission. */
          accessIndicators: {
            canViewPii: accessible,
            identitySource: "vault",
          },
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


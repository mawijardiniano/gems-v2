import { NextResponse } from "next/server";
import { connectDB } from "@/data/lib/db";
import { cacheOrSet } from "@/data/lib/cache";
import { requireRole } from "@/data/lib/auth";
import { canViewPII, loadDecryptedPiiBatch } from "@/data/lib/profileBroker";
import GemsProfile from "@/models/profile";
import ProfileTerm from "@/models/profileTerm";
import {
  AGE_GROUP_ORDER,
  ageGroupOf,
  parseListParam,
} from "@/app/(pages)/(event)/gender-statistics/components/ageGroups.js";
import { TEACHING_CATEGORY_ORDER } from "@/app/(pages)/(event)/gender-statistics/components/employeeStats.js";

const CACHE_TTL = 60 * 1000;

/* Roles whose pages call this route: the GAD Focal Person and Coordinator
   (gender-statistics, events dashboard), the SUC President (president
   gender-statistics pages) and Admin. Anyone else — including a caller with
   no login — is refused: filtered breakdowns can narrow to one person (one
   LGBTQIA+ employee in an office), so the counts are not public data. */
const GENDER_STATS_ROLES = [
  "Admin",
  "GAD Focal Person",
  "GAD Coordinator",
  "SUC President",
];

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

/* Percentage to one decimal place; 0 when there is no whole. */
function pct(part, whole) {
  return whole ? Math.round((part / whole) * 1000) / 10 : 0;
}

/* The {Female, Male, Other, total, pctFemale} shape every breakdown row
   carries, from a counts bucket (missing buckets read as zeros). */
function countRow(c = {}) {
  const total = c.total || 0;
  return {
    Female: c.Female || 0,
    Male: c.Male || 0,
    Other: c.Other || 0,
    total,
    pctFemale: pct(c.Female || 0, total),
  };
}

/* Counts profiles by key, split by sex. A falsy key skips the profile, so
   callers that want an "Unspecified" bucket put the fallback in `keyOf`. */
function countBy(profiles, keyOf, sexOf) {
  const counts = {};
  profiles.forEach((p) => {
    const key = keyOf(p);
    if (!key) return;
    if (!counts[key]) counts[key] = emptyCounts();
    addCounts(counts[key], sexOf(p));
  });
  return counts;
}

function toList(countsObj, nameKey) {
  return Object.entries(countsObj)
    .map(([name, c]) => ({ [nameKey]: name, ...countRow(c) }))
    .sort((a, b) => b.total - a.total);
}

/* Civil status and religion are PII, so they are absent from the GEMS document
   once the legacy columns are stripped. `buildStats` is handed profiles that
   carry their decrypted vault identity (`countingIdentity`), so both values are decrypted before
   they arrive and counting them costs one more pass over the same array - no
   extra vault read. Rows keep the same {name, Female, Male, Other, total}
   shape the sample module produces, so the sample/live toggle cannot drift. */
const PII_UNKNOWN = "Unknown";

function piiBreakdown(profiles, read, sexOf) {
  return toList(
    countBy(profiles, (p) => read(p) || PII_UNKNOWN, sexOf),
    "name",
  );
}

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

/* The filterable student/demographic types. Every one except Scholar reads a
   vaulted field (the `gadData` block no longer exists on the GEMS document),
   so these are applied in memory after decryption, never in the Mongo query —
   a query on `gadData.*` silently matches nothing. Solo Parent has no field
   and is never offered as a filter. */
const STUDENT_TYPES = [
  "Scholar",
  "Person with Disability (PWD)",
  "Indigenous Peoples (IP)",
  "Low Income",
  "Middle Income",
  "High Income",
];

const DEMOGRAPHIC_TEST = new Map(
  DEMOGRAPHIC_ROWS.map((row) => [row.label, row.test]),
);

/* The identity fields the counts read, taken from the decrypted vault row in
   the legacy `personal` / `gadData` shape the builders expect. The route
   returns aggregates only, so this is the full set regardless of the caller's
   role: the masked row shape drops birthday, gender identity, civil status,
   religion and income, which zeroed those tables for masked roles and — with
   the role absent from the cache key — leaked into every role's response. */
/* The vault fields countingIdentity reads — the only ones loaded. */
const COUNTING_FIELDS = [
  "birthday",
  "civil_status",
  "religion",
  "sexAtBirth",
  "gender_preference",
  "isPWD",
  "isIndigenousPerson",
  "socioEconomicStatus",
];

function countingIdentity(pii) {
  if (!pii) return { personal: {}, gadData: {} };
  return {
    personal: {
      birthday: pii.birthday || null,
      civil_status: pii.civil_status || null,
      religion: pii.religion || null,
    },
    gadData: {
      sexAtBirth: pii.sexAtBirth || null,
      gender_preference: pii.gender_preference || null,
      isPWD: pii.isPWD ?? null,
      isIndigenousPerson: pii.isIndigenousPerson ?? null,
      socioEconomicStatus: pii.socioEconomicStatus || null,
    },
  };
}

/* One counts bucket per DEMOGRAPHIC_ROWS entry, in that order. Shared by the
   demographics table and the student-type breakdown, which differ only in
   the row label's key and in whether pctFemale is included. */
function countDemographicRows(profiles, sexOf) {
  return DEMOGRAPHIC_ROWS.map((row) => {
    const counts = emptyCounts();
    profiles.forEach((p) => {
      if (row.test(p)) addCounts(counts, sexOf(p));
    });
    return { label: row.label, counts };
  });
}

function buildDemographics(profiles, sexOf) {
  return countDemographicRows(profiles, sexOf).map(({ label, counts }) => {
    const { pctFemale, ...row } = countRow(counts);
    return { label, ...row };
  });
}

function orderIndex(order, value) {
  const idx = order.indexOf(value);
  return idx === -1 ? order.length : idx;
}

/* The six student type categories as table rows - the same tests as the
   demographics table, exposed as a filterable breakdown. */
function buildStudentTypes(profiles, sexOf) {
  return countDemographicRows(profiles, sexOf).map(({ label, counts }) => ({
    type: label,
    ...countRow(counts),
  }));
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

  const byGroup = toList(
    countBy(profiles, groupKey, sexOf),
    isStudent ? "college" : "office",
  ).filter((r) => (isStudent ? r.college : r.office) !== "Unspecified");

  let byProgram = [];
  let byLevel = [];
  let byYearLevel = [];
  let byStudentType = [];
  let byAppointment = [];
  let byEmploymentStatus = [];
  let byTeaching = [];

  if (isStudent) {
    const programCounts = countBy(
      profiles,
      (p) => p?.affiliation?.academic_information?.course || "Unspecified",
      sexOf,
    );
    byProgram = toList(programCounts, "program")
      .filter((r) => r.program !== "Unspecified")
      .slice(0, 10);

    const levelOf = (p) => {
      const college = p?.affiliation?.academic_information?.college || "";
      const course = p?.affiliation?.academic_information?.course || "";
      const yearLevel = p?.affiliation?.academic_information?.year_level || "";
      const isGraduate =
        college === "Graduate School" || /graduate/i.test(college);
      const isDoctoral = /doctor/i.test(course) || /doctor/i.test(yearLevel);
      const isMasters =
        !isDoctoral &&
        (isGraduate || /master/i.test(course) || /master/i.test(yearLevel));
      return isDoctoral
        ? "Graduate (Doctoral)"
        : isMasters
          ? "Graduate (Masters)"
          : "Undergraduate";
    };
    byLevel = toList(countBy(profiles, levelOf, sexOf), "level");

    /* No fallback: a profile without a year level is left out. */
    const yearLevelCounts = countBy(
      profiles,
      (p) => p?.affiliation?.academic_information?.year_level,
      sexOf,
    );
    byYearLevel = toList(yearLevelCounts, "year_level").sort(
      (a, b) =>
        orderIndex(YEAR_LEVELS, a.year_level) -
          orderIndex(YEAR_LEVELS, b.year_level) || b.total - a.total,
    );

    byStudentType = buildStudentTypes(profiles, sexOf);
  } else {
    byAppointment = toList(
      countBy(
        profiles,
        (p) =>
          p?.affiliation?.employment_information
            ?.employment_appointment_status || "Unspecified",
        sexOf,
      ),
      "status",
    );

    byEmploymentStatus = toList(
      countBy(
        profiles,
        (p) =>
          p?.affiliation?.employment_information?.employment_status ||
          "Unspecified",
        sexOf,
      ),
      "status",
    );

    /* Teaching vs non-teaching: the same two-bucket rollup of
       `employment_status` that `teachingCategoryOf` applies to the sample
       records in employeeStats.js. `employment_status` is the field the
       `personnel_type` filter queries, so both agree by construction. */
    const teachingCounts = countBy(
      profiles,
      (p) =>
        p?.affiliation?.employment_information?.employment_status === "Faculty"
          ? "Faculty"
          : "Non-Teaching Personnel",
      sexOf,
    );
    /* Both categories always appear, in a fixed order, even when empty. */
    byTeaching = TEACHING_CATEGORY_ORDER.map((name) => ({
      name,
      ...countRow(teachingCounts[name]),
    }));
  }

  const ageCounts = countBy(
    profiles,
    (p) => ageGroupOf({ birthday: p?.personal?.birthday }),
    sexOf,
  );
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
      pctFemale: pct(totals.Female, totals.total),
      pctMale: pct(totals.Male, totals.total),
      pctOther: pct(totals.Other, totals.total),
      lgbtqia,
      pctLgbtqia: pct(lgbtqia, totals.total),
    },
    [isStudent ? "byCollege" : "byOffice"]: byGroup,
    ...(isStudent
      ? { byProgram, byLevel, byYearLevel, byStudentType }
      : { byAppointment, byEmploymentStatus, byTeaching }),
    byGenderIdentity: genderIdentityRows(profiles),
    demographics: buildDemographics(profiles, sexOf),
    civilData: piiBreakdown(profiles, (p) => p?.personal?.civil_status, sexOf),
    religionData: piiBreakdown(profiles, (p) => p?.personal?.religion, sexOf),
  };
}

/* `terms` is the person type's term rows, loaded once in GET; rows whose
   profile is not in `baseProfiles` are skipped. */
function buildByAcademicYear(baseProfiles, sexOf, terms) {
  const profilesById = new Map(baseProfiles.map((p) => [String(p._id), p]));

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
    const { error, status, user } = await requireRole(req, GENDER_STATS_ROLES);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const url = new URL(req.url);
    const type =
      url.searchParams.get("type") === "employees" ? "employees" : "students";
    /* Multi-select filters arrive comma-joined (e.g. "1st,2nd"); single values
       still parse to a one-item list so old callers keep working. */
    /* Campus and course live in `academic_information`, which only students
       have — `employment_information` carries neither. For employees they
       could only ever match nothing, so they are ignored (and kept out of the
       cache key) rather than turning the page empty. */
    const isStudentRequest = type === "students";
    const campuses = isStudentRequest
      ? parseListParam(url.searchParams.get("campus"))
      : [];
    const colleges = parseListParam(url.searchParams.get("college"));
    const courses = isStudentRequest
      ? parseListParam(url.searchParams.get("course"))
      : [];
    const semesters = parseListParam(url.searchParams.get("semester"));
    const yearLevels = parseListParam(url.searchParams.get("year_level"));
    const personnelTypes = parseListParam(
      url.searchParams.get("personnel_type"),
    );
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
    /* This route returns counts only — no name, no birthday, no contact — and
       computes them from the full decrypted identity for every caller, so the
       figures do not depend on the role. `role` is deliberately NOT in the
       cache key for that reason (unlike the list and dashboard routes, where
       the row payload differs). The one role-dependent field,
       `accessIndicators.canViewPii`, is set after the cache read. If a future
       change ever puts an identity field in this response, this key has to
       gain the role too. */
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
          match["affiliation.employment_information.office"] = {
            $in: colleges,
          };
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
        /* Sex, student type, demographics and age bands all read vaulted
           fields, so none of them can be filtered here — they are applied in
           memory after the vault read, below. A `gadData.*` condition on this
           query matches nothing now that the block is stripped. */

        /* Only GEMS-owned fields are projected: identity comes from the vault. */
        const baseProfiles = await GemsProfile.find(match, {
          affiliation: 1,
          vaultRef: 1,
        }).lean();

        /* One vault read for the whole result set. Decrypted in full for every
           caller — see countingIdentity — since only aggregates leave here. */
        const piiByRef = await loadDecryptedPiiBatch(
          baseProfiles.map((p) => p.vaultRef),
          { fields: COUNTING_FIELDS },
        );

        /* All term rows for this person type, in one query. Year options,
           semester options, the term filter and the academic-year trend are
           all derived from it. Scoped to the type (not to the other filters)
           so a year option never vanishes when a filter narrows; unscoped, the
           employee page offered student-only years. When no filter but the
           type applies, `baseProfiles` already is the whole type. */
        const onlyTypeFilter = Object.keys(match).length === 1;
        const typeProfileIds = onlyTypeFilter
          ? baseProfiles.map((p) => p._id)
          : await GemsProfile.distinct("_id", {
              "affiliation.person_type": match["affiliation.person_type"],
            });
        const terms = await ProfileTerm.find(
          { profile_id: { $in: typeProfileIds } },
          { profile_id: 1, school_year: 1, semester: 1 },
        ).lean();

        /* Every row with its decrypted identity, before any filter. The
           academic-year trend is built from this set, as it was before. */
        const allProfiles = baseProfiles.map((p) => ({
          ...p,
          ...countingIdentity(piiByRef.get(String(p.vaultRef || ""))),
        }));
        let profiles = allProfiles;

        if (sexes.length) {
          const wanted = new Set(sexes);
          profiles = profiles.filter((p) => wanted.has(p?.gadData?.sexAtBirth));
        }
        if (
          type === "students" &&
          studentType &&
          STUDENT_TYPES.includes(studentType)
        ) {
          const test = DEMOGRAPHIC_TEST.get(studentType);
          profiles = profiles.filter((p) => test(p));
        }
        if (demographics.length) {
          /* Any selected category matches. */
          const tests = demographics.map((d) => DEMOGRAPHIC_TEST.get(d));
          profiles = profiles.filter((p) => tests.some((test) => test(p)));
        }

        if (schoolYear || semesters.length) {
          const wantedSemesters = new Set(semesters);
          const idSet = new Set(
            terms
              .filter(
                (t) =>
                  (!schoolYear || t.school_year === schoolYear) &&
                  (!semesters.length || wantedSemesters.has(t.semester)),
              )
              .map((t) => String(t.profile_id)),
          );
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
        const schoolYears = [
          ...new Set(terms.map((t) => t.school_year).filter(Boolean)),
        ]
          .sort()
          .reverse();

        const semesterList = new Set(
          terms
            .filter((t) => !schoolYear || t.school_year === schoolYear)
            .map((t) => t.semester),
        );
        const semesterOptions =
          type === "students"
            ? ["1st", "2nd", "Summer"].filter((s) => semesterList.has(s))
            : [];

        const byAcademicYear =
          type === "students"
            ? buildByAcademicYear(allProfiles, sexBucket, terms)
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
          accessIndicators: { identitySource: "vault" },
        };
      },
      CACHE_TTL,
    );

    /* Set per request, outside the role-agnostic cache entry. */
    return NextResponse.json(
      {
        ...result,
        accessIndicators: {
          ...result.accessIndicators,
          canViewPii: accessible,
        },
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("gender-statistics failed:", err);
    return NextResponse.json(
      { message: "Failed to load gender statistics." },
      { status: 500 },
    );
  }
}

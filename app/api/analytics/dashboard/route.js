import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Profile from "@/models/profile";
import UserAuth from "@/models/user";
import ProfileTerm from "@/models/profileTerm";
import { requireAuth } from "@/lib/auth";
import { cacheOrSet } from "@/lib/cache";

const DASHBOARD_CACHE_TTL = 15 * 1000;

const UNKNOWN = "Unknown";

function calcAge(birthday) {
  if (!birthday) return null;
  const birth = new Date(birthday);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age < 0 ? null : age;
}

function countToRows(counts) {
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function addGender(groups, cat, gender) {
  if (!groups[cat]) groups[cat] = { name: cat, Male: 0, Female: 0, Other: 0 };
  groups[cat][gender] = (groups[cat][gender] || 0) + 1;
}

function normalizeGender(v) {
  const s = String(v || "").toLowerCase();
  if (s === "male" || s === "m") return "Male";
  if (s === "female" || s === "f") return "Female";
  return "Other";
}

const SORT_YEAR_ORDER = [
  "grade 11",
  "grade 12",
  "1st year",
  "2nd year",
  "3rd year",
  "4th year",
  "5th year",
  "graduate",
  "graduates",
  "unknown",
];

function sortStudentYearLevels(rows) {
  const rank = (name) => {
    const n = `${name || ""}`.trim().toLowerCase();
    const i = SORT_YEAR_ORDER.findIndex((t) => n === t || n.includes(t));
    return i === -1 ? SORT_YEAR_ORDER.length : i;
  };
  return [...rows].sort(
    (a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name),
  );
}

export async function GET(req) {
  try {
    const { error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    await connectDB();

    const url = new URL(req.url);
    const college = url.searchParams.get("college")?.trim() || null;
    const schoolYear = url.searchParams.get("school_year")?.trim() || null;
    const semester = url.searchParams.get("semester")?.trim() || null;
    const sex = url.searchParams.get("sex")?.trim() || null;
    const personType = url.searchParams.get("person_type")?.trim() || null;
    const yearLevel = url.searchParams.get("year_level")?.trim() || null;
    const employment = url.searchParams.get("employment")?.trim() || null;
    const appointment = url.searchParams.get("appointment")?.trim() || null;

    const cacheKey = `analytics:dashboard:${college || "all"}:${schoolYear || "all"}:${semester || "all"}:${sex || "all"}:${personType || "all"}:${yearLevel || "all"}:${employment || "all"}:${appointment || "all"}`;

    const result = await cacheOrSet(
      cacheKey,
      async () => {
        let termProfileIds = null;
        if (schoolYear || semester) {
          const termFilter = {};
          if (schoolYear) termFilter.school_year = schoolYear;
          if (semester) termFilter.semester = semester;
          const matchingTerms = await ProfileTerm.find(termFilter, {
            profile_id: 1,
          }).lean();
          termProfileIds = new Set(
            matchingTerms.map((t) => String(t.profile_id)),
          );
        }

        const pipeline = [
          {
            $lookup: {
              from: Profile.collection.name,
              localField: "personal_info_id",
              foreignField: "_id",
              as: "personal_info_id",
            },
          },
          {
            $unwind: {
              path: "$personal_info_id",
              preserveNullAndEmptyArrays: true,
            },
          },
        ];

        const match = {};
        if (termProfileIds) {
          match["personal_info_id._id"] = {
            $in: [...termProfileIds].map(
              (id) => new mongoose.Types.ObjectId(id),
            ),
          };
        }
        if (college) {
          match.$or = [
            {
              "personal_info_id.affiliation.academic_information.college":
                college,
            },
            {
              "personal_info_id.affiliation.employment_information.office":
                college,
            },
          ];
        }
        if (sex) {
          match["personal_info_id.gadData.sexAtBirth"] = sex;
        }
        if (personType) {
          match["personal_info_id.personal.currentStatus"] = personType;
        }
        if (yearLevel) {
          match[
            "personal_info_id.affiliation.academic_information.year_level"
          ] = yearLevel;
        }
        if (employment) {
          match[
            "personal_info_id.affiliation.employment_information.employment_status"
          ] = employment;
        }
        if (appointment) {
          match[
            "personal_info_id.affiliation.employment_information.employment_appointment_status"
          ] = appointment;
        }

        if (Object.keys(match).length > 0) {
          pipeline.push({ $match: match });
        }

        const users = await UserAuth.aggregate(pipeline);

        let total = 0;
        let femaleCount = 0;
        let maleCount = 0;
        let pwdCount = 0;
        let ipCount = 0;

        const ageCounts = {};
        const civilCounts = {};
        const religionCounts = {};
        const studentCollegeCounts = {};
        const studentCampusCounts = {};
        const studentYearLevelCounts = {};
        const employmentGroups = {};
        const appointmentGroups = {};
        const officeGroups = {};

        let genderFemale = 0;
        let genderMale = 0;
        const prefCounts = { Male: 0, Female: 0, "LGBTQIA+": 0 };
        let unspecifiedCount = 0;

        const empPrefCounts = { Male: 0, Female: 0, "LGBTQIA+": 0 };
        let empUnspecifiedCount = 0;
        let empFemale = 0;
        let empMale = 0;

        const studentYearGender = {};

        const studentProgramCounts = {};

        const studentYearCourse = {};

        for (const d of users) {
          const p = d.personal_info_id || {};
          const personal = p.personal || {};
          const gad = p.gadData || {};
          const acad = p.affiliation?.academic_information || {};
          const emp = p.affiliation?.employment_information || {};

          total += 1;
          if (gad?.sexAtBirth === "Female") femaleCount += 1;
          if (gad?.sexAtBirth === "Male") maleCount += 1;
          if (gad?.isPWD === true) pwdCount += 1;
          if (gad?.isIndigenousPerson === true) ipCount += 1;

          if (gad?.sexAtBirth === "Female") genderFemale += 1;
          if (gad?.sexAtBirth === "Male") genderMale += 1;
          const pref = gad?.gender_preference;
          if (pref === "Male") prefCounts.Male += 1;
          else if (pref === "Female") prefCounts.Female += 1;
          else if (pref === "LGBTQIA+") prefCounts["LGBTQIA+"] += 1;
          else unspecifiedCount += 1;

          const age = calcAge(personal?.birthday);
          if (age !== null) {
            const bucket = Math.floor(age / 10) * 10;
            const label = `${bucket}–${bucket + 9}`;
            ageCounts[label] = (ageCounts[label] || 0) + 1;
          }

          const civil = personal?.civil_status || UNKNOWN;
          civilCounts[civil] = (civilCounts[civil] || 0) + 1;

          const religion = personal?.religion || UNKNOWN;
          religionCounts[religion] = (religionCounts[religion] || 0) + 1;

          const status = (personal?.currentStatus || "").toLowerCase();
          const isStu = status === "student";
          const isEmp = status === "employee";
          const gender = normalizeGender(gad?.sexAtBirth);

          if (isStu) {
            const collegeName = acad?.college || UNKNOWN;
            studentCollegeCounts[collegeName] =
              (studentCollegeCounts[collegeName] || 0) + 1;
            const campus = acad?.campus || UNKNOWN;
            studentCampusCounts[campus] = (studentCampusCounts[campus] || 0) + 1;
            const year = acad?.year_level || UNKNOWN;
            studentYearLevelCounts[year] = (studentYearLevelCounts[year] || 0) + 1;

            if (!studentYearGender[year])
              studentYearGender[year] = {
                label: year,
                Female: 0,
                Male: 0,
                Other: 0,
                total: 0,
              };
            studentYearGender[year][gender] =
              (studentYearGender[year][gender] || 0) + 1;
            studentYearGender[year].total += 1;

            const program = acad?.course || UNKNOWN;
            studentProgramCounts[program] =
              (studentProgramCounts[program] || 0) + 1;

            if (!studentYearCourse[year]) studentYearCourse[year] = { name: year };
            studentYearCourse[year][program] =
              (studentYearCourse[year][program] || 0) + 1;
          }

          if (isEmp) {
            const empStatus = emp?.employment_status || UNKNOWN;
            addGender(employmentGroups, empStatus, gender);
            const appt = emp?.employment_appointment_status || UNKNOWN;
            addGender(appointmentGroups, appt, gender);
            const office = emp?.office || UNKNOWN;
            addGender(officeGroups, office, gender);

            if (gad?.sexAtBirth === "Female") empFemale += 1;
            if (gad?.sexAtBirth === "Male") empMale += 1;
            const empPref = gad?.gender_preference;
            if (empPref === "Male") empPrefCounts.Male += 1;
            else if (empPref === "Female") empPrefCounts.Female += 1;
            else if (empPref === "LGBTQIA+") empPrefCounts["LGBTQIA+"] += 1;
            else empUnspecifiedCount += 1;
          }
        }

        const preferenceRows = [
          { name: "Male", value: prefCounts.Male },
          { name: "Female", value: prefCounts.Female },
          { name: "LGBTQIA+", value: prefCounts["LGBTQIA+"] },
        ];

        const empPreferenceRows = [
          { name: "Male", value: empPrefCounts.Male },
          { name: "Female", value: empPrefCounts.Female },
          { name: "LGBTQIA+", value: empPrefCounts["LGBTQIA+"] },
        ];

        const studentYearGenderData = Object.values(studentYearGender).sort(
          (a, b) =>
            SORT_YEAR_ORDER.indexOf(a.label) - SORT_YEAR_ORDER.indexOf(b.label),
        );

        const studentYearCourseData = Object.values(studentYearCourse).sort(
          (a, b) =>
            SORT_YEAR_ORDER.indexOf(a.name) - SORT_YEAR_ORDER.indexOf(b.name),
        );

        const courseKeys = [
          ...new Set(
            studentYearCourseData.flatMap((row) =>
              Object.keys(row).filter((k) => k !== "name"),
            ),
          ),
        ].sort();

        return {
          snapshot: {
            total,
            femaleCount,
            maleCount,
            pwdCount,
            ipCount,
          },
          genderPanel: {
            genderData: [
              { name: "Female", value: genderFemale },
              { name: "Male", value: genderMale },
            ],
            preferenceData:
              unspecifiedCount > 0
                ? [
                    ...preferenceRows,
                    { name: "Not specified", value: unspecifiedCount },
                  ]
                : preferenceRows,
          },
          studentYearGenderData,
          studentProgramData: countToRows(studentProgramCounts),
          studentYearCourseData,
          courseKeys,
          employeeGenderPanel: {
            genderData: [
              { name: "Female", value: empFemale },
              { name: "Male", value: empMale },
            ],
            preferenceData:
              empUnspecifiedCount > 0
                ? [
                    ...empPreferenceRows,
                    { name: "Not specified", value: empUnspecifiedCount },
                  ]
                : empPreferenceRows,
          },
          demographics: {
            ageData: Object.entries(ageCounts)
              .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
              .map(([name, value]) => ({ name, value })),
            civilData: countToRows(civilCounts),
            religionData: countToRows(religionCounts),
            studentCollegeData: countToRows(studentCollegeCounts),
            studentCampusData: countToRows(studentCampusCounts),
            studentYearLevelData: sortStudentYearLevels(
              countToRows(studentYearLevelCounts),
            ),
            employmentData: Object.values(employmentGroups),
            appointmentData: Object.values(appointmentGroups),
            employeeOfficeData: Object.values(officeGroups),
          },
        };
      },
      DASHBOARD_CACHE_TTL,
    );

    return NextResponse.json({ status: "success", ...result });
  } catch (err) {
    console.error("GET /api/analytics/dashboard error:", err);
    return NextResponse.json(
      { status: "error", message: "Failed to load dashboard" },
      { status: 500 },
    );
  }
}
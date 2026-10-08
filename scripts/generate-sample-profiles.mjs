/**
 * Generates data/sample-profiles.json: named sample profiles for the
 * 2026-2027 enrollment (students) + 685 employees, each with its school-year/semester
 * term history embedded as `profile_terms[]`.
 *
 *   node scripts/generate-sample-profiles.mjs
 *
 * The profiles themselves come from the shared client-safe module
 * app/(pages)/(event)/gender-statistics/components/sampleProfileRecords.js (the
 * same data the dashboards, reports and user lists show). This script adds
 * addresses (public/data/all.json, seeded PRNG), validates every profile with
 * Profile.validateSync() and every term with ProfileTerm.validateSync(), and
 * writes the JSON. Nothing is written to the database; output is deterministic.
 *
 * Laboratory School is excluded: it is not in the `college` enum of
 * models/academic_information.js.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Profile from "../models/profile.js";
import ProfileTerm from "../models/profileTerm.js";
import { COLLEGES } from "../lib/colleges.js";
import {
  SAMPLE_SCHOOL_YEARS as SCHOOL_YEARS,
  SAMPLE_STUDENT_TOTAL,
  SAMPLE_STUDENT_PROFILES,
  SAMPLE_EMPLOYEE_PROFILES,
} from "../app/(pages)/(event)/gender-statistics/components/sampleProfileRecords.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const target = path.join(root, "data", "sample-profiles.json");

const STUDENT_TOTAL = SAMPLE_STUDENT_TOTAL;
const EMPLOYEE_TOTAL = 685;
const YEAR_LABELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

/* Separate seeded PRNG for addresses, so they never disturb the profile data */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20250502);
const pick = (list) => list[Math.floor(rand() * list.length)];
const chance = (p) => rand() < p;

const geo = JSON.parse(
  await readFile(path.join(root, "public", "data", "all.json"), "utf8"),
);
const regionByCode = new Map(geo.regions.map((r) => [r.code, r]));
const provinceByCode = new Map(geo.provinces.map((p) => [p.code, p]));
const barangaysByCity = new Map();
geo.barangays.forEach((b) => {
  if (!barangaysByCity.has(b.city_code)) barangaysByCity.set(b.city_code, []);
  barangaysByCity.get(b.city_code).push(b);
});
const MARINDUQUE = "1704000000";
const localCities = geo.cities.filter(
  (c) => c.province_code === MARINDUQUE && barangaysByCity.has(c.code),
);
const anyCities = geo.cities.filter((c) => barangaysByCity.has(c.code));
if (!localCities.length) {
  throw new Error("No Marinduque cities with barangays found in all.json");
}

const ref = (x) => ({ code: x?.code ?? "", name: x?.name ?? "" });
function addressFor(city) {
  const province = provinceByCode.get(city.province_code);
  const region = regionByCode.get(city.region_code || province?.region_code);
  return {
    region: ref(region),
    province: ref(province),
    city: ref(city),
    barangay: ref(pick(barangaysByCity.get(city.code))),
  };
}

function withAddresses(profile) {
  const permanentCity = chance(0.9) ? pick(localCities) : pick(anyCities);
  const currentCity = chance(0.7) ? permanentCity : pick(localCities);
  const permanentAddress = addressFor(permanentCity);
  const currentAddress =
    currentCity === permanentCity
      ? JSON.parse(JSON.stringify(permanentAddress))
      : addressFor(currentCity);
  return {
    ...profile,
    contact: { ...profile.contact, permanentAddress, currentAddress },
  };
}

const students = SAMPLE_STUDENT_PROFILES.map(withAddresses);
const employees = SAMPLE_EMPLOYEE_PROFILES.map(withAddresses);
const all = [...students, ...employees];


const problems = [];
const seen = {
  student_id: new Set(),
  employee_id: new Set(),
  email: new Set(),
  term: new Set(),
  id: new Set(),
};
const dup = (bucket, value, label) => {
  if (seen[bucket].has(value)) problems.push(`duplicate ${label}: ${value}`);
  seen[bucket].add(value);
};

let termCount = 0;
all.forEach((rec) => {
  const doc = new Profile({
    _id: rec._id,
    personal: rec.personal,
    gadData: rec.gadData,
    affiliation: rec.affiliation,
    contact: rec.contact,
  });
  const error = doc.validateSync();
  if (error) problems.push(`${rec.fullName}: ${error.message}`);

  dup("id", rec._id, "_id");
  dup("email", rec.contact.email, "email");
  const info = rec.affiliation.academic_information;
  const emp = rec.affiliation.employment_information;
  if (info) dup("student_id", info.student_id, "student_id");
  if (emp) dup("employee_id", emp.employee_id, "employee_id");

  rec.profile_terms.forEach((term) => {
    termCount += 1;
    const termError = new ProfileTerm(term).validateSync();
    if (termError) problems.push(`${rec.fullName} term: ${termError.message}`);
    dup("term", `${term.profile_id}|${term.school_year}|${term.semester}`, "term");
    const level = term.affiliation.academic_information?.year_level;
    if (level && !YEAR_LABELS.includes(level)) {
      problems.push(`${rec.fullName}: bad year level ${level}`);
    }
  });
});

if (students.length !== STUDENT_TOTAL || employees.length !== EMPLOYEE_TOTAL) {
  problems.push("student/employee counts do not match the configuration");
}

/* Write: one profile per line keeps the file compact and diff-friendly */
const profiles = all.map(({ _meta, ...rec }) => rec);
const lines = profiles.map((rec) => `    ${JSON.stringify(rec)}`);
const output =
  `{\n  "sample": true,\n  "school_years": ${JSON.stringify(SCHOOL_YEARS)},\n` +
  `  "totals": ${JSON.stringify({
    profiles: profiles.length,
    students: students.length,
    employees: employees.length,
    profile_terms: termCount,
  })},\n  "profiles": [\n${lines.join(",\n")}\n  ]\n}\n`;

await mkdir(path.dirname(target), { recursive: true });
await writeFile(target, output, "utf8");

/* Summary */
const tally = (list, fn) =>
  list.reduce((acc, item) => {
    const k = fn(item);
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
const termStats = (list) => {
  const counts = list.map((r) => r.profile_terms.length);
  return `min ${Math.min(...counts)} / max ${Math.max(...counts)} / avg ${(
    counts.reduce((a, b) => a + b, 0) / counts.length
  ).toFixed(2)}`;
};
const sexSplit = (list) => tally(list, (r) => r.gadData.sexAtBirth);

console.log(
  `Wrote ${path.relative(root, target)} - ${profiles.length} profiles ` +
    `(${students.length} students, ${employees.length} employees), ${termCount} terms`,
);
console.log("Students by start year:", tally(students, (r) => r._meta.startYear));
console.log("Student terms per profile:", termStats(students));
console.log("Employee terms per profile:", termStats(employees));
console.log("Student sex:", sexSplit(students));
console.log("Employee sex:", sexSplit(employees));
console.log(
  "LGBTQIA+ (students/employees):",
  students.filter((r) => r.gadData.gender_preference === "LGBTQIA+").length,
  "/",
  employees.filter((r) => r.gadData.gender_preference === "LGBTQIA+").length,
);
console.log(
  "Student year levels (current):",
  tally(
    students,
    (r) =>
      r.affiliation.academic_information.year_level ||
      "(none - Graduate School)",
  ),
);
console.log(
  `Colleges covered: ${
    Object.keys(
      tally(students, (r) => r.affiliation.academic_information.college),
    ).length
  }/${COLLEGES.length}`,
);
console.log(
  `Offices covered: ${
    Object.keys(
      tally(employees, (r) => r.affiliation.employment_information.office),
    ).length
  }`,
);
console.log(
  "Employee status:",
  tally(employees, (r) => r.affiliation.employment_information.employment_status),
);

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  problems.slice(0, 20).forEach((p) => console.error(` - ${p}`));
  process.exit(1);
}
console.log(
  "\nValidation: 0 errors; ids, emails, terms and name+birthday are unique.",
);

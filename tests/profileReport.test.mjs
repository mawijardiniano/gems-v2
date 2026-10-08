import { test } from "node:test";
import assert from "node:assert";

import {
  buildProfileTable,
  defaultProfileFields,
  normalizeProfileFields,
  profileFieldsFor,
  profileOrientation,
  profileReportTitle,
} from "../app/(pages)/(event)/reports/profileReportFields.js";
import {
  profileReportRecords,
} from "../app/(pages)/(event)/reports/profileReport.js";
import {
  SAMPLE_EMPLOYEE_PROFILE_COUNT,
  SAMPLE_STUDENT_PROFILE_COUNT,
} from "../app/(pages)/(event)/gender-statistics/components/sampleProfileRecords.js";

const build = (population, fields, filters = {}) =>
  buildProfileTable({
    population,
    fields,
    records: profileReportRecords(population, filters),
  });

test("records: both = students + employees, tagged by type", () => {
  const records = profileReportRecords("both");
  assert.strictEqual(
    records.length,
    SAMPLE_STUDENT_PROFILE_COUNT + SAMPLE_EMPLOYEE_PROFILE_COUNT,
  );
  assert.strictEqual(
    records.filter((r) => r.__type === "Student").length,
    SAMPLE_STUDENT_PROFILE_COUNT,
  );
  assert.strictEqual(
    profileReportRecords("employees").length,
    SAMPLE_EMPLOYEE_PROFILE_COUNT,
  );
});

test("fields: Type only exists in both mode; non-common fields unavailable", () => {
  assert.ok(profileFieldsFor("both").some((f) => f.value === "type"));
  assert.ok(!profileFieldsFor("students").some((f) => f.value === "type"));
  const yearLevel = profileFieldsFor("both").find((f) => f.value === "yearLevel");
  assert.strictEqual(yearLevel.available, false);
  assert.deepStrictEqual(normalizeProfileFields("both", ["yearLevel", "sex"]), [
    "sex",
  ]);
  assert.deepStrictEqual(defaultProfileFields("both"), ["type"]);
  assert.deepStrictEqual(defaultProfileFields("students"), []);
  assert.deepStrictEqual(defaultProfileFields("employees"), []);
});

test("aggregated Age + Sex: age-band rows, totals add up", () => {
  const table = build("students", ["age", "sex"]);
  assert.strictEqual(table.mode, "aggregated");
  assert.deepStrictEqual(table.head, [
    "Age Group",
    "Female",
    "Male",
    "Total",
    "% Female",
  ]);
  const last = table.body[table.totalRowIndex];
  assert.strictEqual(last[0], "Total");
  assert.strictEqual(
    Number(last[3].replace(/,/g, "")),
    SAMPLE_STUDENT_PROFILE_COUNT,
  );
});

test("aggregated Sex only: single all-population row, no total row", () => {
  const table = build("employees", ["sex"]);
  assert.strictEqual(table.body.length, 1);
  assert.strictEqual(table.body[0][0], "All personnel");
  assert.strictEqual(table.totalRowIndex, null);
});

test("aggregated both: Type splits students and employees", () => {
  const table = build("both", ["type", "sex"]);
  assert.deepStrictEqual(
    table.body.slice(0, 2).map((row) => row[0]),
    ["Student", "Employee"],
  );
});

test("masterlist: Name selected gives one row per person in field order", () => {
  const table = build("students", ["age", "name", "sex"]);
  assert.strictEqual(table.mode, "masterlist");
  assert.deepStrictEqual(table.head, ["Name", "Sex", "Age"]);
  assert.strictEqual(table.body.length, SAMPLE_STUDENT_PROFILE_COUNT);
  const names = table.body.map((row) => row[0]);
  assert.deepStrictEqual(
    names,
    [...names].sort((a, b) => a.localeCompare(b)),
  );
});

test("empty selection throws; orientation and titles", () => {
  assert.throws(() => build("students", []), /at least one field/);
  assert.strictEqual(profileOrientation("masterlist", 4), "portrait");
  assert.strictEqual(profileOrientation("masterlist", 5), "landscape");
  assert.strictEqual(profileOrientation("aggregated", 5), "portrait");
  assert.strictEqual(
    profileReportTitle("both", "masterlist"),
    "Student and Employee Gender Profile Masterlist",
  );
});

test("semester filter narrows students only", () => {
  const all = profileReportRecords("both").length;
  const narrowed = profileReportRecords("both", { semester: "Summer" }).length;
  assert.ok(narrowed < all);
  assert.ok(narrowed >= SAMPLE_EMPLOYEE_PROFILE_COUNT);
});

import {
  applyProfileFilters,
  isFilterable,
  profileFilterOptions,
  profileFilterSummary,
} from "../app/(pages)/(event)/reports/profileFilters.js";
import { baseProfileRecords } from "../app/(pages)/(event)/reports/profileReport.js";

test("filters: Yes + No flag filters sum back to the unfiltered total", () => {
  const all = profileReportRecords("students");
  const yes = profileReportRecords("students", {}, { scholar: ["Yes"] });
  const no = profileReportRecords("students", {}, { scholar: ["No"] });
  assert.ok(yes.length > 0 && no.length > 0);
  assert.ok(yes.every((r) => r.scholar === true));
  assert.strictEqual(yes.length + no.length, all.length);
});

test("filters: value filter narrows masterlist and aggregated totals", () => {
  const filters = { campus: ["Boac"] };
  const records = profileReportRecords("students", {}, filters);
  assert.ok(records.every((r) => r.campus === "Boac"));
  const table = buildProfileTable({ population: "students", fields: ["campus", "sex"], records });
  assert.deepStrictEqual(table.body.map((r) => r[0]), ["Boac", "Total"]);
  const list = buildProfileTable({ population: "students", fields: ["name"], records });
  assert.strictEqual(list.body.length, records.length);
});

test("filters: eligibility per population (Scholar/Campus not in both or employees)", () => {
  assert.ok(isFilterable("students", "scholar"));
  assert.ok(!isFilterable("employees", "scholar"));
  assert.ok(!isFilterable("both", "scholar"));
  assert.ok(!isFilterable("both", "campus"));
  assert.ok(isFilterable("both", "pwd"));
  assert.ok(!isFilterable("students", "program"));
  assert.ok(!isFilterable("students", "name"));
  const base = baseProfileRecords("both", {});
  const opts = profileFilterOptions("both", base);
  assert.ok(opts.sex && opts.pwd && !opts.scholar && !opts.campus);
  assert.deepStrictEqual(applyProfileFilters("both", base, { scholar: ["Yes"] }).length, base.length);
});

test("filters: summary text", () => {
  assert.strictEqual(
    profileFilterSummary("students", { scholar: ["Yes"], campus: ["Boac", "Gasan"] }),
    "Campus: Boac, Gasan; Scholar = Yes",
  );
  assert.strictEqual(profileFilterSummary("students", {}), "");
});

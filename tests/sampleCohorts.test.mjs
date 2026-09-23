import { test } from "node:test";
import assert from "node:assert";

import { assignStartYears } from "../app/(pages)/(event)/gender-statistics/components/sampleCohorts.js";

const YEARS = ["Y1", "Y2", "Y3", "Y4", "Y5"];
const SEX_KEYS = ["Female", "Male"];
const GROWTH = { Fast: 0.5, Steady: 0, Slow: -0.5 };

/* 200 records across three groups with very different growth profiles:
   Fast 30F/30M, Steady 50F/50M, Slow 20F/20M. */
function population() {
  const records = [];
  [
    ["Fast", 60],
    ["Steady", 100],
    ["Slow", 40],
  ].forEach(([group, size]) => {
    for (let i = 0; i < size; i += 1) {
      records.push({ sex: i % 2 ? "Male" : "Female", group });
    }
  });
  return records;
}

/* One row per sample year, one count per sex (100 female + 100 male records). */
const TARGETS = [
  { Female: 40, Male: 45 },
  { Female: 15, Male: 15 },
  { Female: 15, Male: 15 },
  { Female: 15, Male: 15 },
  { Female: 15, Male: 10 },
];

const count = (records, { group, sex, year } = {}) =>
  records.filter(
    (record) =>
      (!group || record.group === group) &&
      (!sex || record.sex === sex) &&
      (!year || record.startYear === year),
  ).length;

test("assignStartYears: deterministic, with both totals exact", () => {
  const first = population();
  const second = population();
  const options = {
    years: YEARS,
    targets: TARGETS,
    growthByGroup: GROWTH,
    groupKey: "group",
  };

  assignStartYears(first, SEX_KEYS, options);
  assignStartYears(second, SEX_KEYS, options);
  assert.deepStrictEqual(first, second, "the split must be deterministic");

  /* Every record got a year, and each year took its curated cohort size. */
  first.forEach((record) => assert.ok(YEARS.includes(record.startYear)));
  YEARS.forEach((year, index) =>
    SEX_KEYS.forEach((sex) =>
      assert.strictEqual(
        count(first, { year, sex }),
        TARGETS[index][sex],
        `${year} ${sex} cohort`,
      ),
    ),
  );

  /* Each group kept every one of its records. */
  [
    ["Fast", 60],
    ["Steady", 100],
    ["Slow", 40],
  ].forEach(([group, size]) =>
    assert.strictEqual(count(first, { group }), size, `${group} total`),
  );
});

test("assignStartYears: the growth profile decides where a group sits", () => {
  const records = population();
  assignStartYears(records, SEX_KEYS, {
    years: YEARS,
    targets: TARGETS,
    growthByGroup: GROWTH,
    groupKey: "group",
  });

  /* A growing group holds more records in the newest year than in the oldest,
     a shrinking group the other way around. */
  assert.ok(
    count(records, { group: "Fast", year: "Y5" }) >
      count(records, { group: "Fast", year: "Y1" }),
  );
  assert.ok(
    count(records, { group: "Slow", year: "Y1" }) >
      count(records, { group: "Slow", year: "Y5" }),
  );

  /* Steady sits in the middle of the two. */
  const growthRatio = (group) =>
    count(records, { group, year: "Y5" }) /
    count(records, { group, year: "Y1" });
  assert.ok(growthRatio("Fast") > growthRatio("Steady"));
  assert.ok(growthRatio("Steady") > growthRatio("Slow"));

  /* Every group is still visible in every year. */
  YEARS.forEach((year) =>
    ["Fast", "Steady", "Slow"].forEach((group) =>
      assert.ok(
        count(records, { group, year }) >= 1,
        `${group} missing in ${year}`,
      ),
    ),
  );
});

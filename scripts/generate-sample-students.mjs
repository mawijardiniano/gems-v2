/**
 * Regenerates app/(pages)/(event)/gender-statistics/data/sample-students.json
 * from the sample student records, so the committed snapshot always matches
 * exactly what the students page computes when sample data is on.
 *
 *   node scripts/generate-sample-students.mjs
 *
 * The JSON file is a fixture: tests read it, the page does not.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SAMPLE_STUDENT_RECORDS } from "../app/(pages)/(event)/gender-statistics/components/studentSampleRecords.js";
import { computeStudentStats } from "../app/(pages)/(event)/gender-statistics/components/studentStats.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(
  here,
  "..",
  "app",
  "(pages)",
  "(event)",
  "gender-statistics",
  "data",
  "sample-students.json",
);

const snapshot = computeStudentStats(SAMPLE_STUDENT_RECORDS);

await writeFile(target, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
console.log(
  `Wrote ${path.relative(path.join(here, ".."), target)} - ${
    snapshot.totals.total
  } students (${snapshot.totals.Female}F / ${snapshot.totals.Male}M / ${
    snapshot.totals.Other
  } other)`,
);
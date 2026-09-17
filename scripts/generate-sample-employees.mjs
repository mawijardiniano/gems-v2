/**
 * Regenerates app/(pages)/(event)/gender-statistics/data/sample-employees.json
 * from the sample employee records, so the committed snapshot always matches
 * exactly what the employees page computes (and what the quick-report PDFs
 * print) when sample data is on.
 *
 *   node scripts/generate-sample-employees.mjs
 *
 * The JSON file is a fixture: tests read it, the page does not.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SAMPLE_EMPLOYEE_RECORDS } from "../app/(pages)/(event)/gender-statistics/components/employeeSampleRecords.js";
import { computeEmployeeStats } from "../app/(pages)/(event)/gender-statistics/components/employeeStats.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(
  here,
  "..",
  "app",
  "(pages)",
  "(event)",
  "gender-statistics",
  "data",
  "sample-employees.json",
);

const snapshot = {
  type: "employees",
  sample: true,
  ...computeEmployeeStats(SAMPLE_EMPLOYEE_RECORDS),
};

await writeFile(target, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
console.log(
  `Wrote ${path.relative(path.join(here, ".."), target)} — ${
    snapshot.totals.total
  } employees (${snapshot.totals.Female}F / ${snapshot.totals.Male}M / ${snapshot.totals.Other} other)`,
);

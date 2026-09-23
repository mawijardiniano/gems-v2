
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
  } employees (${snapshot.totals.Female}F / ${snapshot.totals.Male}M / ${
    snapshot.totals.lgbtqia
  } LGBTQIA+)`,
);

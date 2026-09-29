/**
 * Shared cohort plumbing for the two sample datasets.
 *
 * Both the student and the employee sample split a fixed population across five
 * academic years. Every year has to stay a complete snapshot (all year levels /
 * offices, not a slice), yet each college or office should grow at its own
 * pace, so the split is done per group with a growth profile and the results
 * are deterministic on every build.
 */

/* One start year per record, so the stride has to be coprime with each sex pool
   to visit every record exactly once (2,097 / 1,328 students, 612 / 404
   employees). */
const START_YEAR_STEP = 7;

/* The sample window ends with the 2024-2025 school year; birthdays are pinned
   to January 1 of this year minus the record's age, so the dashboard's age
   buckets reproduce the curated ages and the dataset never depends on the
   clock. */
export const SAMPLE_AGE_ANCHOR_YEAR = 2025;

/* Every group keeps a toehold in every year: growth never zeroes a year out. */
const MIN_WEIGHT = 0.05;

/**
 * Iterative proportional fitting: scale the rows and the columns of a weight
 * matrix in turn until both land on their targets. The seed holds the shape we
 * want (the yearly trend bent by each group's growth profile), so the fitted
 * matrix keeps that structure while matching both margins.
 */
function fitMatrix(seed, rowTargets, columnTargets, iterations = 100) {
  const matrix = seed.map((row) => row.slice());

  for (let step = 0; step < iterations; step += 1) {
    matrix.forEach((row, index) => {
      const sum = row.reduce((acc, value) => acc + value, 0);
      const target = rowTargets[index] || 0;
      if (!sum || !target) return;
      const scale = target / sum;
      row.forEach((value, column) => {
        row[column] = value * scale;
      });
    });

    columnTargets.forEach((target, column) => {
      const sum = matrix.reduce((acc, row) => acc + row[column], 0);
      if (!sum) return;
      const scale = (target || 0) / sum;
      matrix.forEach((row) => {
        row[column] *= scale;
      });
    });
  }

  return matrix;
}

/** Largest-remainder split of `total` across `weights` (sums exactly to total). */
function splitExact(weights, total) {
  if (!weights.length || total <= 0) return weights.map(() => 0);
  const sum = weights.reduce((acc, weight) => acc + weight, 0);
  if (!sum) return weights.map(() => 0);

  const exact = weights.map((weight) => (weight / sum) * total);
  const values = exact.map((value) => Math.floor(value));
  let remainder = total - values.reduce((acc, value) => acc + value, 0);
  const byFraction = exact
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac || a.index - b.index);

  let i = 0;
  while (remainder > 0) {
    values[byFraction[i % byFraction.length].index] += 1;
    remainder -= 1;
    i += 1;
  }
  return values;
}

/* Move units inside a row until every column hits its target. A move never
   changes the row total - the group keeps all of its records - and never
   empties a cell, so every group stays visible in every year. */
function balanceColumns(matrix, columns, targets) {
  for (let guard = 0; guard < 100000; guard += 1) {
    let under = -1;
    let over = -1;
    let deficit = 0;
    let surplus = 0;

    columns.forEach((total, index) => {
      const diff = (targets[index] || 0) - total;
      if (diff > deficit) {
        deficit = diff;
        under = index;
      }
      if (-diff > surplus) {
        surplus = -diff;
        over = index;
      }
    });
    if (under === -1 || over === -1) return;

    let donor = -1;
    matrix.forEach((row, index) => {
      if (row[over] <= 1) return;
      if (donor === -1 || row[over] > matrix[donor][over]) donor = index;
    });
    if (donor === -1) return;

    matrix[donor][over] -= 1;
    matrix[donor][under] += 1;
    columns[over] -= 1;
    columns[under] += 1;
  }
}

/**
 * Hand every record a `startYear` from `targets` (one row per sample year with
 * a count per sex).
 *
 * `growthByGroup` is the growth profile per college/office: a positive value
 * means the group took on people over the window (most of its records start in
 * the newer years), a negative value means it ran down, 0 is steady. A group's
 * weight in year `y` is `yearShare × (1 + growth × (y - 2))`, so the oldest and
 * the newest year swing the most and the groups change places between years.
 *
 * The split is settled as a matrix (rows = groups, columns = sample years) that
 * satisfies both sides exactly: every year takes its curated cohort size and
 * every group keeps every one of its records.
 */
export function assignStartYears(
  records,
  sexKeys,
  { years, targets, growthByGroup = {}, groupKey, step = START_YEAR_STEP },
) {
  sexKeys.forEach((sex) => {
    const pool = records.filter((record) => record.sex === sex);
    if (!pool.length) return;

    const sizes = new Map();
    pool.forEach((record) => {
      const group = record[groupKey];
      sizes.set(group, (sizes.get(group) || 0) + 1);
    });

    const columnTargets = years.map(
      (_, yearIndex) => targets[yearIndex]?.[sex] || 0,
    );
    const grandTotal = columnTargets.reduce((sum, count) => sum + count, 0);
    if (!grandTotal) return;

    /* Phase 1 - a seed matrix with the yearly trend bent by each group's growth
       profile, fitted so that every group's own total is exact, then rounded
       row by row. Rows are the quantities that must add up to the group size,
       so they are rounded first. */
    const groups = [...sizes.keys()];
    const seed = groups.map((group) =>
      years.map(
        (_, yearIndex) =>
          (columnTargets[yearIndex] / grandTotal) *
          Math.max(
            MIN_WEIGHT,
            1 + (growthByGroup[group] || 0) * (yearIndex - 2),
          ),
      ),
    );
    const fitted = fitMatrix(
      seed,
      groups.map((group) => sizes.get(group)),
      columnTargets,
    );
    const matrix = fitted.map((row, index) =>
      splitExact(row, sizes.get(groups[index])),
    );

    /* Even the smallest group stays visible in every year. */
    matrix.forEach((row, index) => {
      if (sizes.get(groups[index]) < years.length) return;
      row.forEach((count, yearIndex) => {
        if (count > 0) return;
        const donor = row.indexOf(Math.max(...row));
        if (row[donor] <= 1) return;
        row[donor] -= 1;
        row[yearIndex] = 1;
      });
    });

    /* Phase 2 - column sums (exact per year) by moving units inside a group. */
    const columns = years.map((_, yearIndex) =>
      matrix.reduce((sum, row) => sum + row[yearIndex], 0),
    );
    balanceColumns(matrix, columns, columnTargets);

    const remaining = new Map(
      groups.map((group, index) => [group, matrix[index]]),
    );

    /* One pass over the pool hands the years out, so the cohorts interleave
       instead of lining up with the record order. */
    for (let i = 0; i < pool.length; i += 1) {
      const record = pool[(i * step) % pool.length];
      const row = remaining.get(record[groupKey]);
      let pick = 0;
      for (let year = 1; year < row.length; year += 1) {
        if (row[year] > row[pick]) pick = year;
      }
      row[pick] -= 1;
      record.startYear = years[pick];
    }
  });
}

/**
 * Expand `{ ages, Female, Male }` age rows into one `YYYY-01-01` birthday per
 * record for `sex`.
 *
 * The ages cycle through each row's `ages` list, and the birthday is pinned to
 * January 1 of `SAMPLE_AGE_ANCHOR_YEAR - age`. The dashboard derives its age
 * buckets from the birthday (like the live API does from `personal.birthday`),
 * so the sample needs a date - not just an age - to mirror that computation.
 */
export function birthdayValues(targets, sex) {
  return targets
    .flatMap((target) =>
      Array(target[sex] || 0)
        .fill(0)
        .map((_, index) => target.ages[index % target.ages.length]),
    )
    .map((age) => `${SAMPLE_AGE_ANCHOR_YEAR - age}-01-01`);
}

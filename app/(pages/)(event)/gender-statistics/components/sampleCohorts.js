/* One start year per record, so the stride has to be coprime with each sex pool
   to visit every record exactly once (2,097 / 1,328 students, 612 / 404
   employees). */
const START_YEAR_STEP = 7;

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
   changes the row total (the group keeps all of its records) and never empties
   a cell (every group stays visible in every year). */
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

    const columnTargets = years.map((_, yearIndex) => targets[yearIndex]?.[sex] || 0);
    const grandTotal = columnTargets.reduce((sum, count) => sum + count, 0);
    if (!grandTotal) return;

    /* Row weights: the overall year shape, bent by the group's own growth. */
    const matrix = [...sizes.entries()].map(([group, size]) =>
      splitExact(
        years.map(
          (_, yearIndex) =>
            (columnTargets[yearIndex] / grandTotal) *
            (1 + (growthByGroup[group] || 0) * (yearIndex - 2)),
        ),
        size,
      ),
    );

    /* Even the smallest group stays visible in every year. */
    matrix.forEach((row, index) => {
      if (sizes.get([...sizes.keys()][index]) < years.length) return;
      row.forEach((count, yearIndex) => {
        if (count > 0) return;
        const donor = row.indexOf(Math.max(...row));
        if (row[donor] <= 1) return;
        row[donor] -= 1;
        row[yearIndex] = 1;
      });
    });

    const columns = years.map((_, yearIndex) =>
      matrix.reduce((sum, row) => sum + row[yearIndex], 0),
    );
    balanceColumns(matrix, columns, columnTargets);

    const remaining = new Map(
      [...sizes.keys()].map((group, index) => [group, matrix[index]]),
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

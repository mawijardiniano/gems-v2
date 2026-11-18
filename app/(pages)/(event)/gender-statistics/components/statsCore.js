/* Counting helpers shared by the sample-data aggregators in employeeStats.js
   and studentStats.js. Both files used to carry identical copies; a fix made
   to one could silently miss the other and let the two pages drift. Each file
   re-exports the public helpers, so existing importers are unchanged. */

export const SEXES = ["Female", "Male"];

export function sexOf(record) {
  return SEXES.includes(record?.sex) ? record.sex : "Female";
}

export function emptyCounts() {
  return { Female: 0, Male: 0, total: 0 };
}

export function addCounts(bucket, sex) {
  bucket[sex] = (bucket[sex] || 0) + 1;
  bucket.total += 1;
}

export function orderIndex(order, value) {
  const idx = order.indexOf(value);
  return idx === -1 ? order.length : idx;
}

export function toList(countsObj, nameKey, order) {
  const rows = Object.entries(countsObj).map(([name, c]) => ({
    [nameKey]: name,
    Female: c.Female || 0,
    Male: c.Male || 0,
    total: c.total || 0,
    pctFemale: c.total ? Math.round(((c.Female || 0) / c.total) * 1000) / 10 : 0,
  }));

  if (order) {
    rows.sort(
      (a, b) =>
        orderIndex(order, a[nameKey]) - orderIndex(order, b[nameKey]) ||
        b.total - a.total,
    );
  } else {
    rows.sort((a, b) => b.total - a.total);
  }
  return rows;
}

export function activeFilterCount(filters = {}) {
  return Object.values(filters).filter((value) =>
    Array.isArray(value) ? value.length > 0 : Boolean(value),
  ).length;
}

/** Distinct values of a record field, in the order they first appear. */
export function uniqueFieldOptions(records = [], key) {
  const seen = new Set();
  const values = [];
  records.forEach((record) => {
    const value = record?.[key];
    if (!value || seen.has(value)) return;
    seen.add(value);
    values.push(value);
  });
  return values;
}

export const GENDER_IDENTITY_ORDER = ["Male", "Female", "LGBTQIA+"];

export function genderIdentityRows(records = []) {
  const counts = new Map(GENDER_IDENTITY_ORDER.map((name) => [name, 0]));
  let unspecified = 0;
  records.forEach((record) => {
    const value = record?.genderIdentity;
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

export const pct = (part, whole) =>
  whole ? Math.round((part / whole) * 1000) / 10 : 0;

export function groupBy(records, keyFn, nameKey, order) {
  const counts = {};
  records.forEach((record) => {
    const key = keyFn(record) || "Unspecified";
    if (!counts[key]) counts[key] = emptyCounts();
    addCounts(counts[key], sexOf(record));
  });
  return toList(counts, nameKey, order);
}

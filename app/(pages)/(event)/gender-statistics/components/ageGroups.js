/* Shared age-band helpers for the gender-statistics filters and breakdowns.
   Age is computed as of today (or a supplied reference date), the same
   convention the admin dashboard and events pages use. */

export const AGE_GROUP_ORDER = [
  "Under 15",
  "15-19",
  "20-24",
  "25-29",
  "30-34",
  "35-39",
  "40-44",
  "45+",
];

export function ageFromBirthday(birthday, now = new Date()) {
  if (!birthday) return null;
  const born = new Date(birthday);
  if (Number.isNaN(born.getTime())) return null;
  let age = now.getFullYear() - born.getFullYear();
  const monthDiff = now.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < born.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

export function ageGroupForAge(age) {
  if (age == null) return null;
  if (age < 15) return "Under 15";
  if (age >= 45) return "45+";
  const start = Math.floor(age / 5) * 5;
  return `${start}-${start + 4}`;
}

/** Age band of a record that carries a `birthday`, or null when unknown. */
export function ageGroupOf(record, now = new Date()) {
  return ageGroupForAge(ageFromBirthday(record?.birthday, now));
}

/** Bands present in a record list, youngest first. */
export function ageGroupOptions(records = [], now = new Date()) {
  const present = new Set();
  records.forEach((record) => {
    const group = ageGroupOf(record, now);
    if (group) present.add(group);
  });
  return AGE_GROUP_ORDER.filter((group) => present.has(group));
}

/** Birthday date range [min (exclusive of older), max] for an age band, used
    by the live API to turn a band into a `personal.birthday` query. */
export function ageGroupBirthdayRange(group, now = new Date()) {
  const bounds = {
    "Under 15": [0, 14],
    "45+": [45, 150],
  };
  let min;
  let max;
  if (bounds[group]) {
    [min, max] = bounds[group];
  } else {
    const match = /^(\d+)-(\d+)$/.exec(group || "");
    if (!match) return null;
    min = Number(match[1]);
    max = Number(match[2]);
  }
  /* Age >= min  <=> born on or before (now - min years);
     Age <= max  <=> born after (now - (max + 1) years). */
  const latest = new Date(now);
  latest.setFullYear(latest.getFullYear() - min);
  const earliest = new Date(now);
  earliest.setFullYear(earliest.getFullYear() - (max + 1));
  return { gt: earliest, lte: latest };
}

export function parseListParam(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value) {
    return value.split(",").map((v) => v.trim()).filter(Boolean);
  }
  return [];
}

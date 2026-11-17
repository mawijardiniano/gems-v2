/**
 * Event Insights aggregation.
 *
 * Every number on the Insights tab is computed here, from two plain arrays:
 *   - `profiles` — `personal_info_id` documents of attendees with an account
 *   - `guests`   — approved `EventGuest` rows from the public QR check-in
 *
 * The caller is responsible for the de-duplication (an account that also has a
 * manual-encode guest row must appear once); `content.jsx` already does that
 * before calling in. This module only counts.
 *
 * It lives in `lib/` rather than inside the tab because the parent component is
 * 900+ lines and none of these figures were testable, which is how four wrong
 * numbers survived: stakeholders bucketed as Unspecified, a chart memo that
 * never saw the guests, an `undefined` slice in the college chart and an average
 * age that mixed birthdays with self-reported ages.
 *
 * Pure functions only — no React, no mongoose, no `Date.now()` except the one
 * documented default — so `tests/eventInsights.test.mjs` can pin every case.
 */

/** Age in whole years at `now`, or null when there is no usable birthday. */
export const ageFromBirthday = (birthday, now = new Date()) => {
  if (!birthday) return null;
  const birth = new Date(birthday);
  if (Number.isNaN(birth.getTime())) return null;
  let age = now.getFullYear() - birth.getFullYear();
  const monthDelta = now.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 0 && age <= 130 ? age : null;
};

/* A guest row counts as attendance unless it was explicitly rejected. Rows
   written before manual validation existed carry no status and are treated as
   approved, so historical reports keep their numbers. */
export const isApprovedGuest = (guest) =>
  !guest?.validation_status || guest?.validation_status === "approved";

/** Approved guest rows only, from whatever the API returned. */
export const approvedGuestRows = (guests = []) =>
  (Array.isArray(guests) ? guests : []).filter(isApprovedGuest);

/**
 * Reads a participant's sector from either source and returns one of the four
 * buckets the sector cards render.
 *
 * Both paths used to differ: guests mapped `Stakeholder` correctly while
 * profile holders fell through `else` into `Unspecified`, so the same real
 * person landed in a different bucket depending on whether they had logged in.
 */
export const sectorOfProfile = (profile) => {
  const status = String(profile?.personal?.currentStatus || "").trim();
  if (status === "Student") return "Student";
  if (status === "Employee") return "Employee";
  if (status === "Stakeholder") return "Stakeholder";
  return "Unspecified";
};

export const sectorOfGuest = (guest) => {
  const type = String(guest?.participant_type || "").trim();
  if (type === "Student") return "Student";
  if (type === "Employee") return "Employee";
  if (type === "Stakeholder") return "Stakeholder";
  return "Unspecified";
};

/** Sex at birth from a profile or a guest row; "" when unknown. */
export const sexOfProfile = (profile) => {
  const sex = profile?.gadData?.sexAtBirth;
  return sex === "Male" || sex === "Female" ? sex : "";
};

export const sexOfGuest = (guest) => {
  const sex = guest?.sex;
  return sex === "Male" || sex === "Female" ? sex : "";
};

/**
 * College or office a participant belongs to, or "" when neither is recorded.
 *
 * Employees have an office, students have a college; the chart shows both in one
 * column. Returning "" instead of `undefined` matters: the old code incremented
 * a literal `undefined` key and drew an unlabelled bar.
 */
export const affiliationOfProfile = (profile) => {
  const affiliation = profile?.affiliation || {};
  const office = String(affiliation?.employment_information?.office || "").trim();
  const college = String(affiliation?.academic_information?.college || "").trim();
  return office || college || "";
};

export const affiliationOfGuest = (guest) =>
  String(guest?.department_office_org || "").trim();

/* Year-level labels, most senior first. Guests type "3rd Year" into the QR
   form, so both the long and short spellings are recognised. */
const YEAR_ORDER = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "5th Year",
  "6th Year",
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
];

const yearRank = (label) => {
  const index = YEAR_ORDER.findIndex((year) =>
    label.toLowerCase().startsWith(year.toLowerCase()),
  );
  if (index !== -1) return index;
  const numeric = Number.parseInt(label, 10);
  return Number.isNaN(numeric) ? 99 : numeric + 10;
};

/* Guest students store one combined "Program Year Section" value. */
const yearFromGuestRow = (guest) => {
  if (guest?.participant_type !== "Student") return "";
  const raw = String(guest?.program_year_section || "");
  const match = raw.match(/\b([1-6](?:st|nd|rd|th)\s*Year|[1-6](?:st|nd|rd|th))\b/i);
  return match ? match[1].replace(/\s+/g, " ").trim() : "";
};

/** Groups `{ name, value }` pairs into a sorted chart series. */
const toSeries = (counts, sorter) => {
  const entries = Object.entries(counts).filter(
    ([name]) => name && name !== "null" && name !== "undefined",
  );
  if (sorter) entries.sort(sorter);
  return entries.map(([name, value]) => ({ name, value }));
};

/**
 * Everything the Insights tab renders, in one pass.
 *
 * @param {object[]} profiles Attendee profiles, already de-duplicated by caller.
 * @param {object[]} guests   Guest rows, approved or not; filtered here.
 * @param {{ now?: Date }} [options]
 */
export function computeInsights(profiles = [], guests = [], { now = new Date() } = {}) {
  const profileList = Array.isArray(profiles) ? profiles.filter(Boolean) : [];
  const guestList = approvedGuestRows(guests);

  /* ── Sector mix ───────────────────────────────────────────────── */
  const roleCounts = { Student: 0, Employee: 0, Stakeholder: 0, Unspecified: 0 };
  profileList.forEach((profile) => {
    roleCounts[sectorOfProfile(profile)] += 1;
  });
  guestList.forEach((guest) => {
    roleCounts[sectorOfGuest(guest)] += 1;
  });

  /* ── Sex ──────────────────────────────────────────────────────── */
  const sexCounts = { Male: 0, Female: 0 };
  profileList.forEach((profile) => {
    const sex = sexOfProfile(profile);
    if (sex) sexCounts[sex] += 1;
  });
  guestList.forEach((guest) => {
    const sex = sexOfGuest(guest);
    if (sex) sexCounts[sex] += 1;
  });
  const genderData = [
    { name: "Male", value: sexCounts.Male },
    { name: "Female", value: sexCounts.Female },
  ];

  /* ── Age ──────────────────────────────────────────────────────── */
  /* `ages` keeps the participant count so the UI can admit when the average is
     drawn from only part of the audience (a guest who skipped the field). */
  const ages = [];
  profileList.forEach((profile) => {
    const age = ageFromBirthday(profile?.personal?.birthday, now);
    if (age !== null) ages.push(age);
  });
  guestList.forEach((guest) => {
    const age = Number(guest?.age);
    if (Number.isFinite(age) && age > 0) ages.push(age);
  });

  const ageBins = {};
  ages.forEach((age) => {
    const bucket = Math.floor(age / 10) * 10;
    const label = `${bucket}-${bucket + 9}`;
    ageBins[label] = (ageBins[label] || 0) + 1;
  });
  const ageData = toSeries(ageBins, (a, b) => Number.parseInt(a[0], 10) - Number.parseInt(b[0], 10));

  const avgAge = ages.length
    ? Math.round((ages.reduce((sum, age) => sum + age, 0) / ages.length) * 10) / 10
    : null;

  /* ── College / office ─────────────────────────────────────────── */
  const collegeCounts = {};
  profileList.forEach((profile) => {
    const affiliation = affiliationOfProfile(profile);
    if (!affiliation) return;
    collegeCounts[affiliation] = (collegeCounts[affiliation] || 0) + 1;
  });
  guestList.forEach((guest) => {
    const affiliation = affiliationOfGuest(guest);
    if (!affiliation) return;
    collegeCounts[affiliation] = (collegeCounts[affiliation] || 0) + 1;
  });
  const collegeData = toSeries(collegeCounts, (a, b) => b[1] - a[1]);

  /* ── Year level ───────────────────────────────────────────────── */
  const yearCounts = {};
  profileList.forEach((profile) => {
    const year = String(profile?.affiliation?.academic_information?.year_level || "").trim();
    if (!year) return;
    yearCounts[year] = (yearCounts[year] || 0) + 1;
  });
  guestList.forEach((guest) => {
    const year = yearFromGuestRow(guest);
    if (!year) return;
    yearCounts[year] = (yearCounts[year] || 0) + 1;
  });
  const perYearData = toSeries(yearCounts, (a, b) => yearRank(a[0]) - yearRank(b[0]));

  /* ── Totals ───────────────────────────────────────────────────── */
  /* Profiles plus approved guests — the caller has already removed anyone who
     appears in both, so this is a headcount, not a row count. */
  const attendedCount = profileList.length + guestList.length;

  return {
    attendedCount,
    maleCount: sexCounts.Male,
    femaleCount: sexCounts.Female,
    avgAge,
    /* How many participants contributed an age, so the UI can say "of N". */
    ageSampleSize: ages.length,
    roleCounts,
    genderData,
    ageData,
    collegeData,
    perYearData,
  };
}


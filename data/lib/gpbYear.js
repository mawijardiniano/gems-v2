/**
 * The year of a GPB, as sent in a route param, query or body.
 *
 * Routes used to differ: creating a GPB checked for a whole year between 2000
 * and 2100, while the year page and the reports only rejected NaN, so
 * "2025.5" or "1e9" reached the database. Every GPB route reads the year here.
 *
 * Returns the year as a number, or null when it is not a valid GPB year.
 */
export const MIN_GPB_YEAR = 2000;
export const MAX_GPB_YEAR = 2100;

export function parseGpbYear(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!/^\d{4}$/.test(text)) return null;
  const year = Number(text);
  return year >= MIN_GPB_YEAR && year <= MAX_GPB_YEAR ? year : null;
}

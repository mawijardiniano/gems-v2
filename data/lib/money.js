/* One way to show peso amounts. Screens used four: no decimals, up to two,
   at least two (so up to three), and "Php " + default locale — so the same
   budget read differently on the year page, the GAD page and the print. */

const PESO_FORMAT = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "1,234,567.80" — or `fallback` for a missing or non-numeric amount
    (a missing budget used to print "NaN"). */
export function formatAmount(value, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? PESO_FORMAT.format(n) : fallback;
}

/** "₱ 1,234,567.80" — or `fallback`. */
export function formatPeso(value, fallback = "₱ 0.00") {
  const amount = formatAmount(value, null);
  return amount === null ? fallback : `₱ ${amount}`;
}

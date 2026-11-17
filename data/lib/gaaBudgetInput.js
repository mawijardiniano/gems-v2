/* Validation for GAA budget create/update bodies. Pure so it can be tested.
   The routes used to store whatever arrived: a missing field became a 500,
   a negative total or a 250% GAD share was accepted. */

/** Rounds a peso amount to centavos, half up (avoids 6135802.470000001).
    Rounding the 15-significant-digit form first undoes binary error, so
    98,765,432.10 × 5% (stored as …271.6049999995) rounds to .61, not .60. */
export const roundCentavos = (amount) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return n;
  return Math.round(Number(n.toPrecision(15)) * 100) / 100;
};

/**
 * @returns {{ year, totalGAA, gadPercent } | { error: string }}
 */
export function parseBudgetInput(body) {
  if (!body || typeof body !== "object") return { error: "Invalid request body" };

  const year = Number(body.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { error: "Enter a valid year." };
  }

  const totalGAA = Number(body.totalGAA);
  if (!Number.isFinite(totalGAA) || totalGAA < 0) {
    return { error: "The total GAA must be zero or a positive amount." };
  }

  const gadPercent =
    body.gadPercent === undefined || body.gadPercent === ""
      ? 5
      : Number(body.gadPercent);
  if (!Number.isFinite(gadPercent) || gadPercent < 0 || gadPercent > 100) {
    return { error: "The GAD share must be between 0 and 100 percent." };
  }

  return { year, totalGAA: roundCentavos(totalGAA), gadPercent };
}


export function buildSchoolYearOptions(currentValue = "") {
  const now = new Date();
  const year = now.getFullYear();
  const start = now.getMonth() >= 5 ? year : year - 1;

  const options = [];
  for (let offset = -1; offset <= 2; offset += 1) {
    const s = start + offset;
    options.push(`${s}-${s + 1}`);
  }

  if (currentValue && !options.includes(currentValue)) {
    options.unshift(currentValue);
  }

  return options;
}

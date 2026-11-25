/* Checks an import row's affiliation against the GemsProfile schema, so a
   value the profile would refuse (an office, campus, college or employment
   status that is not in the schema's list) is reported at validate time
   instead of failing the row during migration. Kept apart from mapping.js,
   which stays free of database imports. */
import GemsProfile from "@/models/profile";

function fieldLabel(path) {
  const last = path.split(".").pop() || path;
  const words = last.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Returns validation errors for affiliation values the profile schema does
 * not accept. Only enum and type errors are reported: a missing value is not,
 * because on an update the stored profile supplies it, and the required
 * fields the import needs are already checked by `validateMappedPayload`.
 */
export function affiliationSchemaErrors(mapped) {
  const affiliation = mapped?.affiliation;
  if (!affiliation) return [];

  const result = new GemsProfile({ affiliation }).validateSync();
  if (!result?.errors) return [];

  const errors = [];
  for (const [path, err] of Object.entries(result.errors)) {
    if (!path.startsWith("affiliation.")) continue;
    if (err.kind !== "enum" && err.name !== "CastError") continue;
    errors.push({
      field: path,
      code: "not_allowed",
      message: `${fieldLabel(path)} "${err.value}" is not one of the accepted values. Correct it in the source file before importing.`,
    });
  }
  return errors;
}

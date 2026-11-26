"use client";

import { HEADER_FIELDS } from "@/app/api/integration/_utils/headerMap";

/* Extra rules for a few fields, shown under the accepted names. */
const NOTES = {
  sex: "F / female → Female, M / male → Male",
  status:
    "Student or Employee; worked out from Student No. or Employee No. when missing",
  semester: "1 / 1st / first, 2 / 2nd / second, summer; falls back to the default",
  school_year: "Falls back to the default school year",
  isPWD: "Read only when the value is true or false (JSON feeds)",
  isIndigenousPerson: "Read only when the value is true or false (JSON feeds)",
};

export default function FieldMappingPanel() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border border-line">
        <thead className="bg-subtle">
          <tr>
            <th className="text-left px-3 py-2">GEMS field</th>
            <th className="text-left px-3 py-2">
              Column names read as this field
            </th>
          </tr>
        </thead>
        <tbody>
          {HEADER_FIELDS.map((f) => (
            <tr key={f.key} className="border-t border-line-subtle">
              <td className="px-3 py-1.5 text-fg">{f.label}</td>
              <td className="px-3 py-1.5 text-fg-3">
                <span className="font-mono text-2xs">
                  {[f.key, ...f.names.filter((n) => n !== f.key)].join(" | ")}
                </span>
                {NOTES[f.key] && (
                  <div className="text-fg-muted">{NOTES[f.key]}</div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-fg-muted mt-2">
        Column names are matched ignoring case, spaces and punctuation, so
        &quot;Employee No.&quot;, &quot;EMPLOYEE_NO&quot; and
        &quot;employeeNo&quot; all read as Employee No. Rows missing a required
        field (first name, last name, status, school year, semester, or a
        Student No., Employee No. or email) are marked invalid during
        validation.
      </p>
    </div>
  );
}

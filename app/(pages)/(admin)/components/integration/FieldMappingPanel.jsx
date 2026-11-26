"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
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

const INPUT_CLASS =
  "w-full border border-line-strong rounded px-2 py-1 text-xs text-fg bg-white";

/* Column names an admin adds for a source whose names the built-in list
   does not know. Saved for every source; used by batches staged after. */
function CustomMappings() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let active = true;
    fetch("/api/integration/field-mapping", { credentials: "include" })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!active) return;
        if (!ok) throw new Error(data?.message || "Could not load the mapping");
        setRows(data.data?.mappings || []);
      })
      .catch((err) => {
        if (active) setMessage({ type: "error", text: err.message });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function update(index, key, value) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    );
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/integration/field-mapping", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappings: rows }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Could not save the mapping");
      setRows(data.data?.mappings || []);
      setMessage({
        type: "success",
        text: "Mapping saved. It applies to files uploaded and syncs run from now on.",
      });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-2" aria-labelledby="custom-mapping-title">
      <div>
        <h3 id="custom-mapping-title" className="text-sm font-semibold text-fg">
          Your column names
        </h3>
        <p className="text-xs text-fg-muted">
          Add a column name your files or HRMIS feed use that the list below
          does not cover, and pick the field it holds. Case, spaces and
          punctuation are ignored. Batches already staged are not changed.
        </p>
      </div>

      {loading ? (
        <p className="text-xs text-fg-muted">Loading…</p>
      ) : (
        <div className="space-y-2">
          {rows.length === 0 && (
            <p className="text-xs text-fg-muted">No column names added yet.</p>
          )}
          {rows.map((row, i) => (
            <div key={i} className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
              <label className="sr-only" htmlFor={`map-col-${i}`}>
                Column name {i + 1}
              </label>
              <input
                id={`map-col-${i}`}
                value={row.column}
                placeholder="Column name in the file"
                onChange={(e) => update(i, "column", e.target.value)}
                className={INPUT_CLASS}
              />
              <span aria-hidden="true" className="text-fg-muted text-xs">
                →
              </span>
              <label className="sr-only" htmlFor={`map-field-${i}`}>
                Field for column {i + 1}
              </label>
              <select
                id={`map-field-${i}`}
                value={row.field}
                onChange={(e) => update(i, "field", e.target.value)}
                className={INPUT_CLASS}
              >
                <option value="">Pick a field</option>
                {HEADER_FIELDS.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                className="px-2 py-1 rounded border border-line-strong text-xs text-fg-3 hover:bg-subtle"
              >
                Remove
              </button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => setRows((prev) => [...prev, { column: "", field: "" }])}
            >
              Add column name
            </Button>
            <Button variant="primary" onClick={save} loading={saving}>
              Save mapping
            </Button>
          </div>
        </div>
      )}

      {message && (
        <p
          role={message.type === "error" ? "alert" : "status"}
          className={`text-xs ${message.type === "error" ? "text-danger" : "text-success"}`}
        >
          {message.text}
        </p>
      )}
    </section>
  );
}

export default function FieldMappingPanel() {
  return (
    <div className="space-y-6">
      <CustomMappings />
      <section className="overflow-x-auto space-y-2" aria-labelledby="builtin-mapping-title">
        <h3 id="builtin-mapping-title" className="text-sm font-semibold text-fg">
          Column names read automatically
        </h3>
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
        <p className="text-xs text-fg-muted">
          Column names are matched ignoring case, spaces and punctuation, so
          &quot;Employee No.&quot;, &quot;EMPLOYEE_NO&quot; and
          &quot;employeeNo&quot; all read as Employee No. Rows missing a
          required field (first name, last name, status, school year,
          semester, or a Student No., Employee No. or email) are marked
          invalid during validation.
        </p>
      </section>
    </div>
  );
}

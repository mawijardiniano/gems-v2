import { test } from "node:test";
import assert from "node:assert";

// Pure helpers behind the Responsible Unit/Office field (select + free typing)
// and its monitoring filter — no DB or network required.
import {
  OFFICE_OPTIONS,
  addTypedOffice,
  normalizeOffice,
  officeOptionList,
  toOfficeArray,
} from "../lib/colleges.js";

test("normalizeOffice collapses casing, ampersands and legacy wording", () => {
  assert.strictEqual(normalizeOffice("GAD Unit"), normalizeOffice("  gad   unit "));
  assert.strictEqual(
    normalizeOffice("Office of the VP for Admin & Finance"),
    normalizeOffice("office of the vp for admin and finance"),
  );
  assert.strictEqual(
    normalizeOffice("Offices under the Office of the University President"),
    normalizeOffice("Office of the University President"),
  );
  assert.strictEqual(normalizeOffice(undefined), "");
});

test("toOfficeArray normalizes legacy single-string and object shapes", () => {
  assert.deepStrictEqual(toOfficeArray(undefined), []);
  assert.deepStrictEqual(toOfficeArray(""), []);
  assert.deepStrictEqual(toOfficeArray("GAD Unit"), ["GAD Unit"]);
  assert.deepStrictEqual(toOfficeArray(["GAD Unit", "", " HRMU "]), [
    "GAD Unit",
    "HRMU",
  ]);
  assert.deepStrictEqual(toOfficeArray({ value: ["GAD Unit"] }), ["GAD Unit"]);
});

test("officeOptionList keeps a typed office selectable next to the canonical list", () => {
  const options = officeOptionList(["Municipal Health Office"]);
  assert.strictEqual(options[0], "Municipal Health Office");
  assert.strictEqual(options.length, OFFICE_OPTIONS.length + 1);
  OFFICE_OPTIONS.forEach((o) => assert.ok(options.includes(o)));
});

test("officeOptionList does not duplicate a canonical office typed in another casing", () => {
  const options = officeOptionList(["gad unit"]);
  assert.strictEqual(options.length, OFFICE_OPTIONS.length);
  assert.ok(options.includes("GAD Unit"));
  assert.ok(!options.includes("gad unit"));
});

test("a typed office equivalent to a selected one counts as a duplicate", () => {
  // Mirrors the guard inside addTypedOffice(), used by both office pickers
  const selected = ["GAD Unit"];
  const isChecked = (office) =>
    selected.some((s) => normalizeOffice(s) === normalizeOffice(office));

  assert.ok(isChecked("  gad   unit "));
  assert.ok(!isChecked("Municipal Health Office"));

  const appended = isChecked("gad unit") ? selected : [...selected, "gad unit"];
  assert.deepStrictEqual(appended, ["GAD Unit"]);
});

test("addTypedOffice trims and appends a hand-typed office", () => {
  assert.deepStrictEqual(
    addTypedOffice(["GAD Unit"], "  Municipal Health Office  "),
    ["GAD Unit", "Municipal Health Office"],
  );
  assert.deepStrictEqual(addTypedOffice([], "Office of the Barangay"), [
    "Office of the Barangay",
  ]);
});

test("addTypedOffice ignores blanks and offices already selected", () => {
  const selected = ["GAD Unit", "College of Engineering"];

  assert.deepStrictEqual(addTypedOffice(selected, ""), selected);
  assert.deepStrictEqual(addTypedOffice(selected, "   "), selected);
  assert.deepStrictEqual(addTypedOffice(selected, undefined), selected);

  /* Same office, different casing or spacing — and the canonical twin of a
     legacy ampersand value still counts as already selected. */
  assert.deepStrictEqual(addTypedOffice(selected, "  gad   unit "), selected);
  assert.deepStrictEqual(
    addTypedOffice(selected, "college of engineering"),
    selected,
  );
  assert.deepStrictEqual(
    addTypedOffice(
      ["College of Arts & Social Sciences"],
      "College of Arts and Social Sciences",
    ),
    ["College of Arts & Social Sciences"],
  );
});

test("addTypedOffice returns the same array when nothing is added", () => {
  /* Identity matters: both pickers hand the result straight to onChange, and a
     no-op must not look like a change. */
  const selected = ["GAD Unit"];
  assert.strictEqual(addTypedOffice(selected, "gad unit"), selected);
  assert.strictEqual(addTypedOffice(selected, "  "), selected);
  assert.notStrictEqual(addTypedOffice(selected, "New Office"), selected);
});

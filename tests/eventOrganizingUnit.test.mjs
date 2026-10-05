import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";

// Pure helpers behind the create-event GAD prefill and the office-name cleanup:
// picking a GAD activity fills the event title with the activity title, and the
// organising office with the unit its creator belongs to — the GAD Unit for a
// focal person, the assigned college for a coordinator. The canonical office
// helpers fold the legacy "&" college spelling onto the "and" option the Event
// model stores. No DB or network required.
import {
  OFFICE_OPTIONS,
  canonicalOfficeList,
  defaultOrganizingUnit,
  matchOfficeOption,
} from "../lib/colleges.js";

test("a GAD focal person's events default to the GAD Unit", () => {
  assert.strictEqual(defaultOrganizingUnit("gad focal person", ""), "GAD Unit");
  assert.strictEqual(
    defaultOrganizingUnit("GAD Focal Person", null),
    "GAD Unit",
  );
  /* The role the profile route returns is already lower-cased, but the name is
     normalised here too so a differently cased caller still matches. */
  assert.strictEqual(
    defaultOrganizingUnit(" gad focal person ", "College of Engineering"),
    "GAD Unit",
  );
});

test("a GAD coordinator's events default to the college they are assigned to", () => {
  assert.strictEqual(
    defaultOrganizingUnit("gad coordinator", "College of Engineering"),
    "College of Engineering",
  );
  assert.strictEqual(
    defaultOrganizingUnit(
      "GAD Coordinator",
      "College of Information and Computing Sciences",
    ),
    "College of Information and Computing Sciences",
  );
});

test("a legacy ampersand assignment still lands on the canonical college", () => {
  /* manage-role assigns from COLLEGES ("and"), but a coordinator assigned
     before the rename can still carry the "&" spelling. */
  assert.strictEqual(
    defaultOrganizingUnit("gad coordinator", "College of Arts & Social Sciences"),
    "College of Arts and Social Sciences",
  );
  assert.strictEqual(
    defaultOrganizingUnit(
      "gad coordinator",
      "College of Fisheries & Aquatic Sciences",
    ),
    "College of Fisheries and Aquatic Sciences",
  );
});

test("roles without a unit of their own are never prefilled", () => {
  ["Dean", "Admin", "User", "SUC President", "", null, undefined].forEach(
    (role) => {
      assert.strictEqual(
        defaultOrganizingUnit(role, "College of Engineering"),
        null,
        `${role} should not prefill an organising unit`,
      );
    },
  );

  /* A coordinator whose college is missing or not one of ours stays empty
     rather than prefilling a name the event model would reject. */
  assert.strictEqual(defaultOrganizingUnit("gad coordinator", ""), null);
  assert.strictEqual(
    defaultOrganizingUnit("gad coordinator", "Municipal Health Office"),
    null,
  );
});

test("every prefilled unit is a canonical option of the office list", () => {
  const units = [
    defaultOrganizingUnit("gad focal person", ""),
    defaultOrganizingUnit("gad coordinator", "College of Engineering"),
    defaultOrganizingUnit(
      "gad coordinator",
      "College of Arts & Social Sciences",
    ),
  ];

  units.forEach((unit) => {
    assert.ok(unit, "expected a prefilled unit");
    assert.ok(
      OFFICE_OPTIONS.includes(unit),
      `${unit} is not an OFFICE_OPTIONS entry`,
    );
  });
});

test('the office list offers the GAD Unit and spells colleges with "and"', () => {
  assert.ok(OFFICE_OPTIONS.includes("GAD Unit"));

  const ampersandColleges = OFFICE_OPTIONS.filter(
    (office) => office.startsWith("College of") && office.includes("&"),
  );
  assert.deepStrictEqual(
    ampersandColleges,
    [],
    `colleges should use "and": ${ampersandColleges.join(", ")}`,
  );
});

test("matchOfficeOption folds a stored name onto its canonical option", () => {
  assert.strictEqual(
    matchOfficeOption("College of Arts & Social Sciences"),
    "College of Arts and Social Sciences",
  );
  assert.strictEqual(
    matchOfficeOption("College of Information & Computing Sciences"),
    "College of Information and Computing Sciences",
  );
  assert.strictEqual(matchOfficeOption("gad unit"), "GAD Unit");
  assert.strictEqual(matchOfficeOption("Municipal Health Office"), null);
  assert.strictEqual(matchOfficeOption(""), null);
  assert.strictEqual(matchOfficeOption(undefined), null);
});

test("canonicalOfficeList rewrites legacy office lists and keeps unknown values", () => {
  assert.deepStrictEqual(
    canonicalOfficeList([
      "College of Arts & Social Sciences",
      "College of Business & Accountancy",
      "College of Fisheries & Aquatic Sciences",
      "College of Information & Computing Sciences",
    ]),
    [
      "College of Arts and Social Sciences",
      "College of Business and Accountancy",
      "College of Fisheries and Aquatic Sciences",
      "College of Information and Computing Sciences",
    ],
  );

  /* The oldest rows stored a single free-text office instead of a list. */
  assert.deepStrictEqual(canonicalOfficeList("GAD Unit"), ["GAD Unit"]);

  /* Anything the office list does not know stays, trimmed, so the backfill
     never silently drops a value. */
  assert.deepStrictEqual(
    canonicalOfficeList(["  Municipal Health Office  ", ""]),
    ["Municipal Health Office"],
  );

  /* Idempotent — a second backfill run writes nothing. */
  const once = canonicalOfficeList(["College of Fisheries & Aquatic Sciences"]);
  assert.deepStrictEqual(canonicalOfficeList(once), once);

  assert.deepStrictEqual(canonicalOfficeList([]), []);
  assert.deepStrictEqual(canonicalOfficeList(null), []);
});

test("the Event model accepts every office the create form can save", () => {
  const source = fs.readFileSync(
    new URL("../models/event.js", import.meta.url),
    "utf8",
  );
  const officeEnums = (source.match(/enum: \[[^\]]*\]/g) || []).filter((block) =>
    block.includes("GAD Unit"),
  );

  assert.strictEqual(
    officeEnums.length,
    1,
    "the organising office enum should list the GAD Unit",
  );

  officeEnums.forEach((block) => {
    assert.ok(
      !/College of [^"]*&/.test(block),
      "an Event enum still lists the legacy ampersand college spelling",
    );

    OFFICE_OPTIONS.forEach((office) => {
      assert.ok(
        block.includes(`"${office}"`),
        `${office} is offered by the form but missing from an Event enum`,
      );
    });
  });
});

test("co-organizing offices take free text, organising offices stay canonical", () => {
  const source = fs.readFileSync(
    new URL("../models/event.js", import.meta.url),
    "utf8",
  );
  const coBlock = source.match(
    /co_organizing_office_unit:\s*\[[\s\S]*?\n    \],/,
  );

  assert.ok(coBlock, "co_organizing_office_unit should stay an array field");
  assert.ok(
    !coBlock[0].includes("enum:"),
    "co-organizing offices accept a hand-typed office/unit, so they carry no enum",
  );
  assert.ok(
    coBlock[0].includes("trim: true"),
    "a typed office should be trimmed before it is stored",
  );
});

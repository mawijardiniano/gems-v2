import { test } from "node:test";
import assert from "node:assert";

// Assigned-only roster join (temporary mode): offices saved, positions manual.
// No DB or network required.
import { HEADERS } from "../lib/universityOfficialsConstants.js";
import {
  buildOrgChart,
  findSeat,
  getOfficialPersonName,
  isSeatFilled,
} from "../lib/universityOfficialsMerge.js";

test("assigned-only chart shows only assigned rows grouped by header", () => {
  const roster = [
    {
      _id: "a1",
      header: HEADERS[0],
      title: "Secretary of the University and of the Board of Regents",
      position: "Secretary of the University and of the Board of Regents",
      name_text: "Dr. Maria Morena V. Santos",
    },
    {
      _id: "a2",
      header: HEADERS[0],
      title: "Chief, Presidential Management Staff",
      position: "Chief, Presidential Management Staff",
      name_text: "Dr. Alfredo M. Ofrecio III",
    },
  ];

  const chart = buildOrgChart(roster);

  assert.strictEqual(chart.stats.filled, 2);
  assert.strictEqual(chart.stats.vacant, 0);
  assert.deepStrictEqual(chart.unlisted, []);
  assert.strictEqual(chart.rows.length, 2);
  assert.strictEqual(chart.byHeader.length, 1);
  assert.strictEqual(chart.byHeader[0].seats.length, 2);
});

test("buildOrgChart tolerates empty and missing rosters", () => {
  const empty = buildOrgChart([]);
  assert.strictEqual(empty.stats.filled, 0);
  assert.strictEqual(empty.stats.vacant, 0);
  assert.strictEqual(buildOrgChart(undefined).stats.seats, 0);
});

test("isSeatFilled matches header + position text", () => {
  const roster = [
    {
      header: HEADERS[0],
      title: "Chief, Presidential Management Staff",
      position: "Chief, Presidential Management Staff",
    },
  ];

  assert.ok(
    isSeatFilled(roster, {
      header: HEADERS[0],
      position: "chief, presidential management staff",
    }),
  );
  assert.strictEqual(
    isSeatFilled(roster, { header: HEADERS[0], position: "Other Position" }),
    false,
  );
  assert.ok(findSeat({ header: HEADERS[0], position: "Some Position" }));
});

test("getOfficialPersonName prefers typed names, then populated refs", () => {
  assert.strictEqual(getOfficialPersonName("Dr. Maria Morena V. Santos"), "Dr. Maria Morena V. Santos");
  assert.strictEqual(getOfficialPersonName({ name_text: "Ms. Lenie P. Zulueta" }), "Ms. Lenie P. Zulueta");
  assert.strictEqual(
    getOfficialPersonName({
      personal_info_id: { personal: { first_name: "Maria", last_name: "Santos" } },
    }),
    "Maria Santos",
  );
  assert.strictEqual(
    getOfficialPersonName({ first_name: "Juan", last_name: "Dela Cruz" }),
    "Juan Dela Cruz",
  );
  assert.strictEqual(getOfficialPersonName({ username: "msantos" }), "msantos");
  assert.strictEqual(getOfficialPersonName(null), "");
});

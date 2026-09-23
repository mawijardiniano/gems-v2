import { test } from "node:test";
import assert from "node:assert";

// Catalog + roster join behind the MarSU university officials feature.
// No DB or network required.
import {
  ALL_TITLES,
  CATALOG,
  HEADERS,
  SEATS_BY_HEADER,
  UNITS_BY_HEADER,
  composePosition,
  findSeatByParts,
} from "../lib/universityOfficialsConstants.js";
import {
  buildOrgChart,
  findSeat,
  getOfficialPersonName,
  isSeatFilled,
} from "../lib/universityOfficialsMerge.js";

test("catalog encodes every header and seat from the official document", () => {
  assert.strictEqual(HEADERS.length, 10);
  assert.strictEqual(CATALOG.length, 147);
  assert.strictEqual(Object.keys(SEATS_BY_HEADER).length, 10);
});

test("no two seats share a key (header + title + unit is unique)", () => {
  const keys = new Set(CATALOG.map((seat) => seat.key));
  assert.strictEqual(keys.size, CATALOG.length);
});

test("titles repeat across the chart while units stay header-specific", () => {
  assert.strictEqual(ALL_TITLES.length, 23);
  assert.ok(ALL_TITLES.includes("Head"));
  assert.ok(ALL_TITLES.includes("Program Chair"));
  assert.ok(ALL_TITLES.includes("GAD Focal Person"));

  const headSeats = CATALOG.filter((seat) => seat.title === "Head");
  assert.strictEqual(headSeats.length, 50);

  const programChairs = CATALOG.filter(
    (seat) => seat.header === "PROGRAM CHAIRPERSONS",
  );
  assert.strictEqual(programChairs.length, 42);

  assert.ok(UNITS_BY_HEADER["OFFICE OF THE PRESIDENT"].includes("Legal Services Unit"));
});

test("identical title+unit under different branches are disambiguated by header", () => {
  const shared = CATALOG.filter(
    (seat) =>
      seat.title === "Head" && seat.unit === "Student Affairs and Services",
  );
  assert.deepStrictEqual(
    shared.map((seat) => seat.header),
    ["MARSU TORRIJOS BRANCH", "MARSU SANTA CRUZ BRANCH", "MARSU GASAN BRANCH"],
  );
});

test("composePosition joins on the first comma only, unit-less titles stand alone", () => {
  assert.strictEqual(
    composePosition("Head", "Information, Communication & Technology Services Center"),
    "Head, Information, Communication & Technology Services Center",
  );
  assert.strictEqual(
    composePosition("Program Chair", "BSIT Welding, Mechanical & Fabrication Tech"),
    "Program Chair, BSIT Welding, Mechanical & Fabrication Tech",
  );
  assert.strictEqual(composePosition("GAD Focal Person", ""), "GAD Focal Person");
  assert.strictEqual(composePosition("University President"), "University President");
});

test("findSeatByParts accepts real seats and rejects invented ones", () => {
  assert.ok(
    findSeatByParts({
      header: "OFFICE OF THE PRESIDENT",
      title: "Head",
      unit: "Legal Services Unit",
    }),
  );
  assert.strictEqual(
    findSeatByParts({
      header: "OFFICE OF THE PRESIDENT",
      title: "Chief",
      unit: "Made-Up Office",
    }),
    null,
  );
});

test("buildOrgChart joins the roster onto seats, counts vacancies, flags unlisted", () => {
  const roster = [
    {
      header: "EXECUTIVE OFFICIALS",
      title: "University President",
      unit: "",
      position: "University President",
      name: "u1",
    },
    {
      header: "MARSU GASAN BRANCH",
      title: "Head",
      unit: "Research, Extension and Training",
      position: "Head, Research, Extension and Training",
      name: "u2",
    },
    {
      header: "OFFICE OF THE PRESIDENT",
      title: "Head",
      unit: "OLD Information Unit Name (renamed)",
      position: "Head, OLD Information Unit Name (renamed)",
      name: "u3",
    },
  ];

  const chart = buildOrgChart(roster);

  assert.strictEqual(chart.stats.seats, 147);
  assert.strictEqual(chart.stats.filled, 2);
  assert.strictEqual(chart.stats.vacant, 145);

  const president = chart.rows.find((row) => row.title === "University President");
  assert.strictEqual(president.official.name, "u1");

  const vacantSeat = findSeat({
    header: "EXECUTIVE OFFICIALS",
    title: "Executive Assistant",
    unit: "",
  });
  const vacantRow = chart.rows.find((row) => row.key === vacantSeat.key);
  assert.strictEqual(vacantRow.official, null);

  assert.strictEqual(chart.unlisted.length, 1);
  assert.strictEqual(chart.unlisted[0].name, "u3");

  const exec = chart.byHeader.find((h) => h.header === "EXECUTIVE OFFICIALS");
  assert.strictEqual(exec.total, 12);
  assert.strictEqual(exec.filled, 1);
  assert.strictEqual(exec.seats.length, 12);
});

test("buildOrgChart tolerates empty and missing rosters", () => {
  const empty = buildOrgChart([]);
  assert.strictEqual(empty.stats.filled, 0);
  assert.strictEqual(empty.stats.vacant, 147);
  assert.strictEqual(buildOrgChart(undefined).stats.seats, 147);
});

test("isSeatFilled detects duplicate assignments, findSeat resolves catalog rows", () => {
  const roster = [
    {
      header: "PROGRAM CHAIRPERSONS",
      title: "Program Chair",
      unit: "BS in Nursing",
    },
  ];

  const taken = findSeat({
    header: "PROGRAM CHAIRPERSONS",
    title: "Program Chair",
    unit: "BS in Nursing",
  });
  const free = findSeat({
    header: "PROGRAM CHAIRPERSONS",
    title: "Program Chair",
    unit: "BS in Midwifery",
  });

  assert.ok(isSeatFilled(roster, taken));
  assert.strictEqual(isSeatFilled(roster, free), false);
});

test("getOfficialPersonName reads populated and lean name references", () => {
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

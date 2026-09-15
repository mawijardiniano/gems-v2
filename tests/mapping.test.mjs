import { test } from "node:test";
import assert from "node:assert";
import {
  mapToStagingPayload,
  buildIdentity,
  buildIdentityDedupeKey,
  validateMappedPayload,
  normalizeName,
  toTitleCase,
} from "../app/api/integration/_utils/mapping.js";

function employeeRow(overrides = {}) {
  return {
    first_name: "Maria",
    last_name: "Cruz",
    employee_id: "2023001",
    current_status: "Employee",
    school_year: "2026-2027",
    semester: "1st",
    ...overrides,
  };
}

function mappedEmployee(overrides = {}) {
  return mapToStagingPayload(employeeRow(overrides));
}

test("identical identities produce identical dedupe keys", () => {
  const a = buildIdentityDedupeKey(buildIdentity(mappedEmployee()));
  const b = buildIdentityDedupeKey(buildIdentity(mappedEmployee()));
  assert.strictEqual(a, "2023001");
  assert.strictEqual(a, b);
});

test("dedupe key is case-insensitive and trimmed", () => {
  const a = buildIdentityDedupeKey(
    buildIdentity(mappedEmployee({ employee_id: "  2023001 " })),
  );
  const b = buildIdentityDedupeKey(
    buildIdentity(mappedEmployee({ employee_id: "2023001" })),
  );
  assert.strictEqual(a, b);
});

test("conflicting duplicates with same ID are detected by key", () => {
  const a = buildIdentityDedupeKey(
    buildIdentity(mappedEmployee({ office: "Registrar" })),
  );
  const b = buildIdentityDedupeKey(
    buildIdentity(mappedEmployee({ office: "HR" })),
  );
  assert.strictEqual(a, b);
});

test("camelCase HRMIS API rows map names, IDs, and infer status", () => {
  const mapped = mapToStagingPayload({
    firstName: "Maria",
    lastName: "Cruz",
    middleName: "Santos",
    studentId: "2023001",
    email: "mcruz@example.ph",
    gender: "F",
  });
  assert.strictEqual(mapped.personal.first_name, "Maria");
  assert.strictEqual(mapped.personal.last_name, "Cruz");
  assert.strictEqual(mapped.personal.middle_name, "Santos");
  assert.strictEqual(mapped.gadData.sexAtBirth, "Female");
  assert.strictEqual(mapped.personal.currentStatus, "Student");
  assert.strictEqual(
    mapped.affiliation.academic_information.student_id,
    "2023001",
  );
});

test("camelCase employee rows map employee identity and infer status", () => {
  const mapped = mapToStagingPayload({
    firstName: "Juan",
    lastName: "Dela Cruz",
    employeeId: "E-2024-001",
    status: "Employee",
    school_year: "2026-2027",
    semester: "1st",
  });
  assert.strictEqual(mapped.personal.currentStatus, "Employee");
  assert.strictEqual(
    mapped.affiliation.employment_information.employee_id,
    "E-2024-001",
  );
  const errors = validateMappedPayload(mapped);
  assert.deepStrictEqual(errors, []);
});

test("SIS/ARO PascalCase CSV export maps every column", () => {
  const mapped = mapToStagingPayload({
    StudentNo: "26B11907",
    LastName: "Jardeleza",
    MiddleName: "Natal",
    FirstName: "Michelle",
    SuffixName: "",
    ProgName: "Bachelor of Science in Nursing",
    YearLevel: "1st Year",
    Gender: "F",
    CivilStatus: "Single",
    Nationality: "Filipino",
    Email: "jardelezam@example.ph",
    CollegeName: "College of Nursing",
  });
  assert.strictEqual(mapped.personal.first_name, "Michelle");
  assert.strictEqual(mapped.personal.last_name, "Jardeleza");
  assert.strictEqual(mapped.personal.middle_name, "Natal");
  assert.strictEqual(mapped.personal.currentStatus, "Student");
  assert.strictEqual(
    mapped.affiliation.academic_information.student_id,
    "26B11907",
  );
  assert.strictEqual(
    mapped.affiliation.academic_information.course,
    "Bachelor of Science in Nursing",
  );
  assert.strictEqual(
    mapped.affiliation.academic_information.year_level,
    "1st Year",
  );
  assert.strictEqual(
    mapped.affiliation.academic_information.college,
    "College of Nursing",
  );
  assert.strictEqual(mapped.contact.email, "jardelezam@example.ph");
  assert.strictEqual(mapped.personal.civil_status, "Single");
  assert.strictEqual(mapped.personal.nationality, "Filipino");
});

test("records without an identity key have an empty dedupe key", () => {
  const mapped = mappedEmployee({ employee_id: "" });
  const key = buildIdentityDedupeKey(buildIdentity(mapped));
  assert.strictEqual(key, "");
});

test("student rows map into academic information", () => {
  const mapped = mapToStagingPayload({
    FirstName: "Juan",
    LastName: "Dela Cruz",
    StudentID: "S-0001",
    status: "Student",
    Course: "BSIT",
    sex: "M",
    school_year: "2026-2027",
    semester: "2",
  });
  assert.strictEqual(mapped.personal.currentStatus, "Student");
  assert.strictEqual(mapped.affiliation.academic_information.student_id, "S-0001");
  assert.strictEqual(mapped.affiliation.academic_information.course, "BSIT");
  assert.strictEqual(mapped.gadData.sexAtBirth, "Male");
  assert.strictEqual(mapped.semester, "2nd");
  assert.deepStrictEqual(mapped.affiliation.employment_information, {});
});

test("employee rows map into employment information", () => {
  const mapped = mappedEmployee({ office: "Registrar" });
  assert.strictEqual(mapped.personal.currentStatus, "Employee");
  assert.strictEqual(
    mapped.affiliation.employment_information.employee_id,
    "2023001",
  );
  assert.strictEqual(mapped.affiliation.employment_information.office, "Registrar");
  assert.deepStrictEqual(mapped.affiliation.academic_information, {});
});

test("semester normalization covers 1/2/summer variants", () => {
  const cases = {
    "1": "1st",
    "1st": "1st",
    First: "1st",
    "First Semester": "1st",
    "2": "2nd",
    "2nd": "2nd",
    Second: "2nd",
    summer: "Summer",
    SUM: "Summer",
  };
  for (const [input, expected] of Object.entries(cases)) {
    const mapped = mapToStagingPayload(employeeRow({ semester: input }));
    assert.strictEqual(mapped.semester, expected, `semester: ${input}`);
  }
});

test("fallback defaults apply when the row has no term info", () => {
  const row = employeeRow();
  delete row.school_year;
  delete row.semester;
  const mapped = mapToStagingPayload(row, {
    school_year: "2025-2026",
    semester: "Summer",
  });
  assert.strictEqual(mapped.school_year, "2025-2026");
  assert.strictEqual(mapped.semester, "Summer");
});

test("valid employee payload passes validation", () => {
  const errors = validateMappedPayload(mappedEmployee({ email: "m@cruz.ph" }));
  assert.deepStrictEqual(errors, []);
});

test("validation requires names, status, term, and an identity key", () => {
  const errors = validateMappedPayload(
    mapToStagingPayload({ school_year: "", semester: "" }),
  );
  const fields = errors.map((e) => e.field);
  assert.ok(fields.includes("personal.first_name"));
  assert.ok(fields.includes("personal.last_name"));
  assert.ok(fields.includes("personal.currentStatus"));
  assert.ok(fields.includes("school_year"));
  assert.ok(fields.includes("semester"));
  assert.ok(fields.includes("identity"));
});


test("normalizeName lowercases, trims, and collapses inner whitespace", () => {
  assert.strictEqual(normalizeName("De La Cruz"), "de la cruz");
  assert.strictEqual(normalizeName("  MARIA   SANTOS "), "maria santos");
  assert.strictEqual(normalizeName("de la cruz"), "de la cruz");
  assert.strictEqual(normalizeName(null), "");
  assert.strictEqual(normalizeName(undefined), "");
  assert.strictEqual(normalizeName(123), "123");
});

test("normalized name variants compare equal despite case and spacing", () => {
  const variants = ["De La Cruz", "de la cruz", "DE LA CRUZ", "de  la  cruz"];
  const expected = normalizeName(variants[0]);
  for (const variant of variants) {
    assert.strictEqual(normalizeName(variant), expected, `variant: ${variant}`);
  }
});

test("toTitleCase capitalizes lowercase, mixed-case, and separator names", () => {
  const cases = {
    "bandejas, kathleen": "Bandejas, Kathleen",
    kathleen: "Kathleen",
    "MARIA CLARA": "Maria Clara",
    "dela cruz": "Dela Cruz",
    "de guzman-santos": "De Guzman-Santos",
    "maria-clara de la cruz": "Maria-Clara De La Cruz",
    "o'brien": "O'Brien",
    "sta. cruz": "Sta. Cruz",
    "  juan   dela cruz  ": "Juan Dela Cruz",
    "IAN KYLE": "Ian Kyle",
    "JV Ann": "Jv Ann",
    "ma. theresa SD cruz": "Ma. Theresa Sd Cruz",
    "juan SANTOS III": "Juan Santos Iii",
  };
  for (const [input, expected] of Object.entries(cases)) {
    assert.strictEqual(toTitleCase(input), expected, `input: ${input}`);
  }
  assert.strictEqual(toTitleCase(""), "");
  assert.strictEqual(toTitleCase(null), "");
  assert.strictEqual(toTitleCase(undefined), "");
  assert.strictEqual(toTitleCase(123), "");
});

test("toTitleCase leaves already-titled names and IDs untouched in casing", () => {
  assert.strictEqual(toTitleCase("Michelle"), "Michelle");
  assert.strictEqual(toTitleCase("Jardeleza"), "Jardeleza");
  assert.strictEqual(toTitleCase("E-2024-001"), "E-2024-001");
});

test("mapToStagingPayload title-cases names from lowercase source rows", () => {
  const mapped = mapToStagingPayload({
    first_name: "kathleen",
    last_name: "bandejas",
    middle_name: "santos",
    employee_id: "2023001",
    current_status: "Employee",
    school_year: "2026-2027",
    semester: "1st",
  });
  assert.strictEqual(mapped.personal.first_name, "Kathleen");
  assert.strictEqual(mapped.personal.last_name, "Bandejas");
  assert.strictEqual(mapped.personal.middle_name, "Santos");
});

test("mapToStagingPayload title-cases PascalCase source rows that are lowercase", () => {
  const mapped = mapToStagingPayload({
    FirstName: "juan",
    LastName: "de guzman-reyes",
    MiddleName: "santos",
    StudentNo: "26B11907",
    school_year: "2026-2027",
    semester: "1",
  });
  assert.strictEqual(mapped.personal.first_name, "Juan");
  assert.strictEqual(mapped.personal.last_name, "De Guzman-Reyes");
  assert.strictEqual(mapped.personal.middle_name, "Santos");
});
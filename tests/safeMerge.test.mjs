import { test } from "node:test";
import assert from "node:assert";
import {
  isEmptyValue,
  mergeValues,
  mergeProfile,
  mergeTermAffiliation,
} from "../app/api/integration/_utils/mapping.js";

function fullIncoming(overrides = {}) {
  return {
    personal: {
      first_name: "Maria",
      middle_name: "Santos",
      last_name: "Cruz",
      birthday: "1990-05-01",
      nationality: "Filipino",
      civil_status: "Married",
      currentStatus: "Employee",
    },
    gadData: { sexAtBirth: "Female" },
    affiliation: {
      academic_information: {},
      employment_information: {
        employee_id: "2023001",
        office: "Registrar",
        employment_status: "Permanent",
      },
    },
    contact: {
      email: "mcruz@example.ph",
      mobileNumber: "09170000000",
    },
    ...overrides,
  };
}

function existingProfile(overrides = {}) {
  return {
    personal: {
      first_name: "Maria",
      middle_name: "Santos",
      last_name: "Cruz",
      birthday: new Date("1990-05-01"),
      nationality: "Filipino",
      civil_status: "Married",
      currentStatus: "Employee",
    },
    gadData: { sexAtBirth: "Female" },
    affiliation: {
      academic_information: {},
      employment_information: {
        employee_id: "2023001",
        office: "Registrar",
        employment_status: "Permanent",
      },
    },
    contact: {
      email: "mcruz@example.ph",
      mobileNumber: "09170000000",
    },
    ...overrides,
  };
}


test("isEmptyValue treats blank strings, null, and undefined as empty", () => {
  assert.strictEqual(isEmptyValue(""), true);
  assert.strictEqual(isEmptyValue("   "), true);
  assert.strictEqual(isEmptyValue(null), true);
  assert.strictEqual(isEmptyValue(undefined), true);
  assert.strictEqual(isEmptyValue("x"), false);
  assert.strictEqual(isEmptyValue(0), false);
  assert.strictEqual(isEmptyValue(false), false);
});

test("mergeValues: blank incoming never wipes an existing value", () => {
  assert.strictEqual(mergeValues("kept@db.ph", ""), "kept@db.ph");
  assert.strictEqual(mergeValues("kept@db.ph", "   "), "kept@db.ph");
  assert.strictEqual(mergeValues("kept@db.ph", null), "kept@db.ph");
  assert.strictEqual(mergeValues("kept@db.ph", undefined), "kept@db.ph");
  assert.strictEqual(mergeValues("old", "new"), "new");
  assert.strictEqual(mergeValues(undefined, "new"), "new");
});


test("blank CSV values never overwrite existing profile values", () => {
  const existing = existingProfile();
  const incoming = fullIncoming({
    contact: { email: "", mobileNumber: "   " },
    personal: {
      first_name: "Maria",
      middle_name: "",
      last_name: "Cruz",
      birthday: null,
      nationality: "   ",
      civil_status: "",
      currentStatus: "Employee",
    },
  });

  const { merged, changes } = mergeProfile(existing, incoming);

  assert.strictEqual(merged.contact.email, "mcruz@example.ph");
  assert.strictEqual(merged.contact.mobileNumber, "09170000000");
  assert.strictEqual(merged.personal.nationality, "Filipino");
  assert.strictEqual(merged.personal.civil_status, "Married");
  assert.strictEqual(merged.personal.middle_name, "Santos");
  assert.ok(
    merged.personal.birthday instanceof Date,
    "existing birthday survives a blank incoming birthday",
  );
  assert.deepStrictEqual(changes, []);
});

test("only fields that actually differ are reported as changes", () => {
  const existing = existingProfile();
  const incoming = fullIncoming({
    personal: {
      ...fullIncoming().personal,
      civil_status: "Widowed", 
    },
    contact: { email: "mcruz@example.ph", mobileNumber: "09171112222" },
  });

  const { merged, changes } = mergeProfile(existing, incoming);

  assert.strictEqual(merged.personal.civil_status, "Widowed");
  assert.strictEqual(merged.contact.mobileNumber, "09171112222");
  assert.strictEqual(changes.length, 2);
  assert.deepStrictEqual(
    changes.map((c) => c.field),
    ["personal.civil_status", "contact.mobileNumber"],
  );
  const civil = changes.find((c) => c.field === "personal.civil_status");
  assert.strictEqual(civil.from, "Married");
  assert.strictEqual(civil.to, "Widowed");
});

test("re-uploading identical data produces an empty change list", () => {
  const existing = existingProfile();
  const { changes } = mergeProfile(existing, fullIncoming());
  assert.deepStrictEqual(changes, []);
});

test("a date-string birthday matches an existing Date birthday (no false change)", () => {
  const existing = existingProfile();
  const { changes } = mergeProfile(existing, fullIncoming());
  const birthdayChanges = changes.filter(
    (c) => c.field === "personal.birthday",
  );
  assert.deepStrictEqual(birthdayChanges, []);
});

test("newly added fields are reported as a change from empty", () => {
  const existing = existingProfile({ contact: { email: "mcruz@example.ph" } });
  const { merged, changes } = mergeProfile(existing, fullIncoming());

  assert.strictEqual(merged.contact.mobileNumber, "09170000000");
  const added = changes.find((c) => c.field === "contact.mobileNumber");
  assert.ok(added, "added field appears in changes");
  assert.strictEqual(added.from, "");
  assert.strictEqual(added.to, "09170000000");
});

test("mongoose-style subdocuments (toObject) merge like plain objects", () => {
  const existing = existingProfile();
  existing.personal = {
    ...existing.personal,
    toObject() {
      const { toObject, ...rest } = this;
      return rest;
    },
  };
  const { changes } = mergeProfile(existing, fullIncoming());
  assert.deepStrictEqual(changes, []);
});

test("blank identity keeps the DB id, office change is still recorded", () => {
  const existing = existingProfile();
  const incoming = fullIncoming({
    affiliation: {
      academic_information: {},
      employment_information: {
        employee_id: "",
        office: "HR",
      },
    },
  });

  const { merged, changes } = mergeProfile(existing, incoming);

  assert.strictEqual(
    merged.affiliation.employment_information.employee_id,
    "2023001",
  );
  assert.strictEqual(merged.affiliation.employment_information.office, "HR");
  assert.ok(
    changes.some(
      (c) => c.field === "affiliation.employment_information.office",
    ),
  );
});


test("partial term upload keeps existing term affiliation values", () => {
  const existingTermAffiliation = {
    academic_information: {
      student_id: "S-0001",
      course: "BSIT",
      year_level: "3rd Year",
    },
    employment_information: { employee_id: "E-1", office: "Registrar" },
  };

  const incoming = {
    academic_information: {
      student_id: "S-0001",
      course: "BSIT",
      year_level: "4th Year",
    },
    employment_information: { employee_id: "E-1", office: "" },
  };

  const merged = mergeTermAffiliation(existingTermAffiliation, incoming);

  assert.strictEqual(merged.employment_information.office, "Registrar");
  assert.strictEqual(merged.academic_information.year_level, "4th Year");
  assert.strictEqual(merged.academic_information.course, "BSIT");
});

test("term affiliation sections without an ID are dropped", () => {
  const merged = mergeTermAffiliation(
    {},
    {
      academic_information: { course: "BSIT" }, // no student_id
      employment_information: {},
    },
  );
  assert.strictEqual(merged.academic_information, undefined);
  assert.strictEqual(merged.employment_information, undefined);
});

test("term affiliation picks up new values from a fuller file", () => {
  const merged = mergeTermAffiliation(
    { employment_information: { employee_id: "E-1" } },
    {
      employment_information: {
        employee_id: "E-1",
        office: "HR",
        employment_status: "Permanent",
      },
    },
  );
  assert.strictEqual(merged.employment_information.office, "HR");
  assert.strictEqual(
    merged.employment_information.employment_status,
    "Permanent",
  );
});

import { test } from "node:test";
import assert from "node:assert";

import {
  SAMPLE_GENDER_PROFILE_TYPES,
  downloadSampleGenderProfile,
  generateSampleGenderProfile,
  isSampleGenderProfile,
  sampleGenderProfileSummary,
} from "../app/(pages)/(event)/reports/sampleGenderProfiles.js";

/* The Reports module (…/reports/content.jsx) renders its two gender profiles
   in the browser with these helpers instead of the live sex-disaggregated API,
   so the PDFs stay complete even when the database holds little data. */

test("isSampleGenderProfile: only the two gender profiles use sample data", () => {
  assert.deepStrictEqual(SAMPLE_GENDER_PROFILE_TYPES, ["students", "employees"]);
  assert.ok(isSampleGenderProfile("students"));
  assert.ok(isSampleGenderProfile("employees"));
  for (const other of ["gar", "milestones", "projects-events", "", undefined]) {
    assert.ok(!isSampleGenderProfile(other));
  }
});

test("sampleGenderProfileSummary: names the sample dataset and its size", () => {
  assert.strictEqual(
    sampleGenderProfileSummary("employees"),
    "Sample dataset - 1,016 employees (university-wide)",
  );
  assert.strictEqual(
    sampleGenderProfileSummary("students"),
    "Sample dataset - 3,425 students (university-wide)",
  );
});

for (const type of SAMPLE_GENDER_PROFILE_TYPES) {
  test(`generateSampleGenderProfile: renders a complete "${type}" PDF`, async () => {
    const doc = await generateSampleGenderProfile(type);
    const buffer = Buffer.from(doc.output("arraybuffer"));

    assert.strictEqual(buffer.subarray(0, 4).toString(), "%PDF");
    assert.ok(buffer.length > 2000, "PDF should not be empty");
    assert.ok(doc.getNumberOfPages() >= 1);
  });
}

test("generateSampleGenderProfile: rejects types without a sample profile", async () => {
  await assert.rejects(
    () => generateSampleGenderProfile("gar"),
    /Unknown gender profile type/,
  );
});

test("downloadSampleGenderProfile: exposed for the reports page buttons", () => {
  assert.strictEqual(typeof downloadSampleGenderProfile, "function");
});

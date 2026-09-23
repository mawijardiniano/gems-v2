/**
 * Schema smoke test for the Research & Extension / Academic project models.
 *
 * Connects with the same MONGODB_URI the app uses, exercises create / enum
 * validation / reference-number uniqueness on the two NEW collections only,
 * then removes every sample row so nothing is left behind.
 *
 * Usage: node scripts/validate-project-models.mjs
 */

import "dotenv/config";
import mongoose from "mongoose";
import ResearchExtensionProject from "../models/researchExtensionProject.js";
import AcademicProject from "../models/academicProject.js";
import { nextProjectRefNumber } from "../lib/referenceNumber.js";

/* Deliberately outside any real academic year so nothing can collide with
   production data, whatever year the app is used in. */
const YEAR = 1900;

let failures = 0;

const pass = (message) => console.log(`OK    ${message}`);
const fail = (message) => {
  failures += 1;
  console.error(`FAIL  ${message}`);
};

const check = (condition, message) => {
  if (condition) pass(message);
  else fail(message);
};

const cleanup = async () => {
  await ResearchExtensionProject.deleteMany({ year: YEAR });
  await AcademicProject.deleteMany({ year: YEAR });
};

/* Mirrors how the API assigns numbers: read the year's refs, take the next. */
const assignRef = async (model, prefix) => {
  const used = await model.find({ year: YEAR }).select("reference_number");
  return nextProjectRefNumber(
    prefix,
    YEAR,
    used.map((doc) => doc.reference_number),
  );
};

const run = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log(
    `[db] Connected to database: ${mongoose.connection.db.databaseName}`,
  );

  /* Build the unique year+reference_number indexes before testing them. */
  await ResearchExtensionProject.init();
  await AcademicProject.init();

  await cleanup();

  try {
    /* 1 — Research & Extension create: FieldSchema wrapping + enum defaults */
    const re = await ResearchExtensionProject.create({
      year: YEAR,
      title: { value: "Community Mangrove Rehabilitation" },
      classification: "Extension",
      category: { value: "Community Outreach / Service" },
      objectives: { value: ["Rehabilitate 5 hectares", "Train 40 volunteers"] },
      beneficiaries: { value: ["Coastal barangays"] },
      budget: { value: 250000 },
      responsible_office: { value: ["Research & Extension Office"] },
      project_leader: new mongoose.Types.ObjectId(),
    });

    re.reference_number = await assignRef(ResearchExtensionProject, "RNE");
    await re.save();

    check(
      re.reference_number === "RNE-1900-001",
      `first RNE ref is ${re.reference_number}`,
    );
    check(
      re.title.value === "Community Mangrove Rehabilitation",
      "title wrapped as { value }",
    );
    check(re.budget.value === 250000, "numeric budget preserved");
    check(re.objectives.value.length === 2, "array field preserved");
    check(re.funding_source === "Internal", "funding_source default applied");
    check(re.project_status === "for-review", "project_status default applied");

    /* 2 — Academic create: plain fields + programs array + nullable number */
    const academic = await AcademicProject.create({
      year: YEAR,
      title: { value: "Outcome-based Curriculum Review" },
      project_type: "Curriculum Development",
      college: "College of Education",
      programs: ["Bachelor of Elementary Education"],
      semester: "1st Semester",
      target_participants: 25,
      budget: { value: 40000 },
    });

    academic.reference_number = await assignRef(AcademicProject, "ACD");
    await academic.save();

    check(
      academic.reference_number === "ACD-1900-001",
      `first ACD ref is ${academic.reference_number}`,
    );
    check(academic.programs.length === 1, "programs plain array stored");
    check(academic.target_participants === 25, "nullable number stored");

    /* 3 — a second R&E project continues its own sequence */
    const re2 = await ResearchExtensionProject.create({
      year: YEAR,
      title: { value: "Fisherfolk Livelihood Study" },
      classification: "Research",
      project_leader: new mongoose.Types.ObjectId(),
    });
    re2.reference_number = await assignRef(ResearchExtensionProject, "RNE");
    await re2.save();

    check(
      re2.reference_number === "RNE-1900-002",
      `second RNE ref is ${re2.reference_number}`,
    );

    /* 4 — enum validation rejects unknown values */
    let enumRejected = false;
    try {
      await AcademicProject.create({
        year: YEAR,
        title: { value: "Invalid college" },
        project_type: "Curriculum Development",
        college: "College of Wizardry",
      });
    } catch (err) {
      enumRejected = err.name === "ValidationError";
    }
    check(enumRejected, "unknown college rejected by enum validation");

    /* 5 — the year + reference_number unique index rejects duplicates */
    let duplicateRejected = false;
    try {
      await ResearchExtensionProject.create({
        year: YEAR,
        reference_number: "RNE-1900-002",
        title: { value: "Duplicate reference attempt" },
        classification: "Research",
        project_leader: new mongoose.Types.ObjectId(),
      });
    } catch (err) {
      duplicateRejected = err.code === 11000;
    }
    check(duplicateRejected, "duplicate RNE reference_number rejected");
  } catch (err) {
    fail(`unexpected error: ${err.message}`);
  } finally {
    await cleanup();
    const remaining =
      (await ResearchExtensionProject.countDocuments({ year: YEAR })) +
      (await AcademicProject.countDocuments({ year: YEAR }));
    check(remaining === 0, "sample rows removed");
    await mongoose.disconnect();
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`);
    process.exitCode = 1;
  } else {
    console.log("\nAll schema checks passed");
  }
};

run().catch((err) => {
  console.error("Validation crashed:", err);
  process.exitCode = 1;
});

import "dotenv/config";
import mongoose from "mongoose";

/**
 * One-time fix for GPB projects that have no creator (`createdBy: null`).
 *
 * Projects created before creator tracking (or inserted by imports) show a
 * blank "Created By" column and cannot be managed by the usual owner rules, so
 * this script assigns them to the GAD Focal Person.
 *
 * The target user is resolved dynamically:
 *   - the only active user with role "GAD Focal Person", or
 *   - the user passed explicitly with `--user-id <id>` when several exist.
 *
 * Only `createdBy` is written; `lastUpdatedBy` is left untouched.
 * Safe to re-run: projects that already have a creator are ignored.
 *
 * Usage: node scripts/assign-missing-project-creators.mjs [--dry-run] [--user-id <id>]
 */

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("[assign-creators] MONGODB_URI is not defined in .env");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");
const userArgIndex = process.argv.indexOf("--user-id");
const requestedUserId = userArgIndex !== -1 ? process.argv[userArgIndex + 1] : null;

const label = (user) => `${user.username} (${user.role})`;

async function resolveTargetUser(col) {
  if (requestedUserId) {
    if (!mongoose.Types.ObjectId.isValid(requestedUserId)) {
      throw new Error(`--user-id "${requestedUserId}" is not a valid ObjectId`);
    }

    const user = await col.findOne({
      _id: new mongoose.Types.ObjectId(requestedUserId),
    });

    if (!user) throw new Error(`No user found with id ${requestedUserId}`);
    return user;
  }

  const focalPersons = await col.find({ role: "GAD Focal Person" }).toArray();

  if (focalPersons.length === 0) {
    throw new Error(
      'No user with role "GAD Focal Person" found — pass --user-id <id> to choose one.',
    );
  }

  if (focalPersons.length === 1) return focalPersons[0];

  const activeFocals = focalPersons.filter((user) => user.is_active !== false);

  if (activeFocals.length === 1) return activeFocals[0];

  throw new Error(
    `Multiple GAD Focal Persons found (${focalPersons
      .map((user) => user._id)
      .join(", ")}) — pass --user-id <id> to choose one.`,
  );
}

const genderIssueOf = (project) => {
  const value = project.gender_issue?.value ?? project.gender_issue ?? "";
  const text = String(value).trim();
  return text.length > 60 ? `${text.slice(0, 57)}...` : text || "(no gender issue)";
};

async function run() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection;

  const target = await resolveTargetUser(db.collection("userauths"));

  const projects = await db
    .collection("projects")
    .find({ createdBy: null })
    .sort({ year: 1, createdAt: 1 })
    .toArray();

  console.log(`[assign-creators] target user: ${label(target)} (${target._id})`);
  console.log(
    `[assign-creators] ${projects.length} project(s) without a creator.`,
  );
  if (dryRun) {
    console.log("[assign-creators] dry run — no writes will be made.");
  }

  let assigned = 0;

  for (const project of projects) {
    assigned += 1;
    console.log(
      `[assign-creators] ${dryRun ? "WOULD SET" : "SET"} ${project._id} (${project.year} · ${genderIssueOf(project)}) -> ${target.username}`,
    );

    if (!dryRun) {
      await db.collection("projects").updateOne(
        { _id: project._id },
        { $set: { createdBy: target._id } },
      );
    }
  }

  console.log(
    `[assign-creators] done — ${assigned} project(s) ${
      dryRun ? "would be " : ""
    }assigned${dryRun ? " (dry run)" : ""}.`,
  );

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("[assign-creators] failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

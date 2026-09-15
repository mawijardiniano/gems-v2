import "dotenv/config";
import mongoose from "mongoose";
import GemsProfile from "../models/profile.js";
import { toTitleCase } from "../app/api/integration/_utils/mapping.js";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error(
    "[capitalize-profile-names] MONGODB_URI is not defined in .env",
  );
  process.exit(1);
}

const DRY_RUN = process.argv.includes("--dry-run");

const NAME_FIELDS = ["first_name", "middle_name", "last_name"];

async function run() {
  await mongoose.connect(MONGODB_URI);

  const mode = DRY_RUN ? "DRY RUN (no changes will be saved)" : "APPLY";
  console.log(`[capitalize-profile-names] Mode: ${mode}`);

  const cursor = GemsProfile.find({}).cursor();

  let updated = 0;
  let unchanged = 0;
  let scanned = 0;

  for await (const profile of cursor) {
    scanned += 1;
    const personal = profile.personal;
    if (!personal) {
      unchanged += 1;
      continue;
    }

    const set = {};
    const logLines = [];

    for (const field of NAME_FIELDS) {
      const current = personal[field];
      if (typeof current !== "string" || current.trim() === "") continue;

      const next = toTitleCase(current);
      if (next === current) continue;

      set[`personal.${field}`] = next;
      logLines.push(
        `  ${field}: "${current}" -> "${next}"`,
      );
    }

    if (Object.keys(set).length === 0) {
      unchanged += 1;
      continue;
    }

    if (!DRY_RUN) {
      await GemsProfile.updateOne({ _id: profile._id }, { $set: set });
    }

    updated += 1;
    console.log(
      `[capitalize-profile-names] ${DRY_RUN ? "WOULD UPDATE" : "OK"} ${profile._id}`,
    );
    for (const line of logLines) console.log(line);
  }

  console.log(
    `[capitalize-profile-names] Done. scanned=${scanned} updated=${updated} unchanged=${unchanged}`,
  );

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("[capitalize-profile-names] FAILED:", err);
  process.exit(1);
});

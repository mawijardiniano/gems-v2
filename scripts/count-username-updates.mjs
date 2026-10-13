import "dotenv/config";
import mongoose from "mongoose";
import UserAuth from "../models/user.js";
import GemsProfile from "../models/profile.js";
import { normalizeUsernameByStatus, isEmailUsername } from "../lib/usernames.js";

// Fast count-only preview: logs how many usernames would update.
// No writes, no CSV. Usage: node scripts/count-username-updates.mjs

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("[count-usernames] MONGODB_URI is not defined in .env");
  process.exit(1);
}

async function run() {
  console.log("[count-usernames] connecting...");
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  console.log("[count-usernames] connected.");

  const users = await UserAuth.find({}).select("username role personal_info_id").lean();
  console.log(`[count-usernames] loaded users=${users.length}`);
  const profileIds = users.map((u) => u.personal_info_id).filter(Boolean);
  const profiles = await GemsProfile.find({ _id: { $in: profileIds } })
    .select("personal.currentStatus")
    .lean();
  console.log(`[count-usernames] loaded profiles=${profiles.length}`);
  const byId = new Map(profiles.map((p) => [String(p._id), p]));
  const existing = new Set(users.map((u) => String(u.username || "")));

  let scanned = 0;
  let unchanged = 0;
  let wouldUpdate = 0;
  let collisions = 0;
  let skippedEmail = 0;
  const targets = new Set();
  const samples = [];

  for (const user of users) {
    scanned += 1;
    const current = String(user.username || "");
    if (isEmailUsername(current)) {
      skippedEmail += 1;
      continue;
    }
    const prof = user.personal_info_id ? byId.get(String(user.personal_info_id)) : null;
    const status = prof?.personal?.currentStatus || "";
    const proposed = normalizeUsernameByStatus(current, status);
    if (!proposed || proposed === current) {
      unchanged += 1;
      continue;
    }
    if ((existing.has(proposed) && proposed !== current) || targets.has(proposed)) {
      collisions += 1;
      continue;
    }
    targets.add(proposed);
    wouldUpdate += 1;
    if (samples.length < 20) samples.push(`${current} -> ${proposed} | ${status || "?"}`);
  }

  console.log(`[count-usernames] scanned=${scanned} unchanged=${unchanged} would-update=${wouldUpdate} collisions=${collisions} skipped-email=${skippedEmail}`);
  console.log("[count-usernames] samples (first 20):");
  for (const s of samples) console.log(`  ${s}`);
  await mongoose.disconnect();
  console.log("[count-usernames] done (no changes made).");
}

run().catch((err) => {
  console.error("[count-usernames] FAILED:", err);
  process.exit(1);
});

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import UserAuth from "../models/user.js";
import GemsProfile from "../models/profile.js";
import { normalizeUsernameByStatus, isEmailUsername, resolveUsernameKind } from "../lib/usernames.js";

/**
 * Preview-first username normalization.
 * UPDATE ALL rule: Student UPPERCASE (24b0128 -> 24B0128),
 * Employee/staff strip [-_. space] keep case (DeLuna-MalinaoEunice -> DeLunaMalinaoEunice).
 * All roles included. Full emails never touched.
 * Collisions are reported, never auto-overwritten.
 * Usage: node scripts/normalize-usernames.mjs --dry-run (preview + CSV)
 *        node scripts/normalize-usernames.mjs --apply (after CSV approved)
 */

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("[normalize-usernames] MONGODB_URI is not defined in .env");
  process.exit(1);
}

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const SHOW = Number(process.env.PREVIEW_SHOW || 100);
const toCsvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
async function run() {
  console.log("[normalize-usernames] connecting...");
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  console.log("[normalize-usernames] connected.");
  const mode = APPLY && !args.includes("--dry-run") ? "APPLY" : "DRY RUN (no changes will be saved)";
  console.log(`[normalize-usernames] Mode: ${mode}`);

  const users = await UserAuth.find({}).select("username role personal_info_id").lean();
  console.log(`[normalize-usernames] loaded users=${users.length}`);
  const profileIds = users.map((u) => u.personal_info_id).filter(Boolean);
  const profiles = await GemsProfile.find({ _id: { $in: profileIds } })
    .select("personal.first_name personal.middle_name personal.last_name personal.currentStatus")
    .lean();
  console.log(`[normalize-usernames] loaded profiles for ${profileIds.length} ids`);
  const byId = new Map(profiles.map((p) => [String(p._id), p]));
  const existingNames = new Set(users.map((u) => String(u.username || "")));

  const rows = [];
  const targets = new Set();
  let scanned = 0;
  let unchanged = 0;
  let skippedEmail = 0;

  for (const user of users) {
    scanned += 1;
    const current = String(user.username || "");
    const prof = user.personal_info_id ? byId.get(String(user.personal_info_id)) : null;
    const status = prof?.personal?.currentStatus || "";
    const full = [prof?.personal?.first_name, prof?.personal?.middle_name, prof?.personal?.last_name]
      .filter(Boolean).join(" ");

    if (isEmailUsername(current)) {
      skippedEmail += 1;
      rows.push({ user, current, proposed: current, status, full, action: "skip_email", reason: "full email untouched" });
      continue;
    }
    const proposed = normalizeUsernameByStatus(current, status);
    if (!proposed || proposed === current) {
      unchanged += 1;
      rows.push({ user, current, proposed: current, status, full, action: "unchanged", reason: "already canonical" });
      continue;
    }
    const taken = existingNames.has(proposed) && proposed !== current;
    if (taken || targets.has(proposed)) {
      rows.push({ user, current, proposed, status, full, action: "skip_collision", reason: "target exists - manual decision" });
      continue;
    }
    targets.add(proposed);
    const kind = resolveUsernameKind(current, status);
    const reason = kind === "student" ? "uppercase" : "strip -_.space";
    rows.push({ user, current, proposed, status, full, action: "update", reason });
  }

  const wouldUpdate = rows.filter((r) => r.action === "update");
  const collisions = rows.filter((r) => r.action === "skip_collision");
  console.log(`[normalize-usernames] scanned=${scanned} unchanged=${unchanged} would-update=${wouldUpdate.length} collisions=${collisions.length} skipped-email=${skippedEmail}`);

  const show = (list, label) => {
    console.log(`${label} (${list.length}):`);
    for (const r of list.slice(0, 100)) console.log(`  ${r.current} -> ${r.proposed} | ${r.status || "?"} | ${r.full || "-"}`);
    if (list.length > 100) console.log(`  ... and ${list.length - 100} more (see CSV)`);
  };
  show(wouldUpdate, "WOULD UPDATE");
  show(collisions, "COLLISIONS - manual decision required");

  const dir = path.join(process.cwd(), "scripts", "backups");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `usernames-preview-${stamp}.csv`);
  const lines = ["user_id,current_username,proposed_username,currentStatus,full_name,action,reason"];
  for (const r of rows) lines.push([String(r.user._id), toCsvCell(r.current), toCsvCell(r.proposed), toCsvCell(r.status), toCsvCell(r.full), r.action, toCsvCell(r.reason)].join(","));
  fs.writeFileSync(file, lines.join("\n"), "utf8");
  console.log(`[normalize-usernames] Preview CSV written to ${file}`);

  if (!APPLY || args.includes("--dry-run")) {
    console.log("[normalize-usernames] Dry run - re-run with --apply after you approve the CSV.");
    await mongoose.disconnect();
    return;
  }
  const backupFile = path.join(dir, `usernames-apply-backup-${stamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(wouldUpdate.map((r) => ({ _id: String(r.user._id), username: r.current })), null, 2), "utf8");
  console.log(`[normalize-usernames] Backup written to ${backupFile}`);
  let applied = 0;
  for (const r of wouldUpdate) {
    await UserAuth.updateOne({ _id: r.user._id }, { $set: { username: r.proposed } });
    applied += 1;
  }
  console.log(`[normalize-usernames] Done. scanned=${scanned} applied=${applied} collisions=${collisions.length}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("[normalize-usernames] FAILED:", err);
  process.exit(1);
});


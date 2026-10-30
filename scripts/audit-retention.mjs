import "dotenv/config";
import mongoose from "mongoose";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

/* `@/` is a Next.js bundler alias, unknown to plain Node. The retention module
   imports the model through it (so the app and this script share one import
   path), which means the alias has to be resolved here before anything is
   loaded. Registered before the dynamic import below. */
const ROOT = pathToFileURL(process.cwd() + "/").href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const base = new URL(specifier.slice(2), ROOT);
      for (const candidate of [
        base.href,
        `${base.href}.js`,
        `${base.href}.mjs`,
        `${base.href}/index.js`,
      ]) {
        if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate, context);
      }
    }
    return nextResolve(specifier, context);
  },
});

const { planRetention, applyRetention, retentionPolicy } = await import(
  "../lib/auditRetention.js"
);

/**
 * Applies the audit-log retention policy (NIST AU-11).
 *
 * This is a *manual* operation on purpose, and that is a decision, not an
 * omission. A scheduled job that deletes audit records is a foothold: whoever
 * can edit the schedule can silently shorten the trail, and the job keeps
 * running after the person who justified it has moved on. Running it here means
 * disposal happens deliberately, by an operator, with the output kept as the
 * record of what was done — and the run can be rehearsed first.
 *
 * Deliberately NOT provided: a cron wrapper, a scheduled workflow, or a
 * CRON_SECRET-triggered route. If someone proposes adding one, the argument has
 * to be made against the paragraph above, not assumed.
 *
 * Defaults to a dry run. Disposal requires --apply, and will not proceed unless
 * the archive write succeeds.
 *
 * Usage:
 *   node scripts/audit-retention.mjs           # report only
 *   node scripts/audit-retention.mjs --apply   # archive expired records, then dispose
 *   node scripts/audit-retention.mjs --apply --batch 1000
 */

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("[audit-retention] MONGODB_URI is not defined in .env");
  process.exit(1);
}

const args = process.argv.slice(2);
const apply = args.includes("--apply");

function readNumberFlag(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = Number(args[index + 1]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function report(policy) {
  console.log("[audit-retention] policy");
  console.log(`  security events : ${policy.security_days} days (${policy.source})`);
  console.log(`  other activity  : ${policy.activity_days} days`);
}

async function main() {
  await mongoose.connect(MONGODB_URI);

  const policy = retentionPolicy();
  report(policy);

  if (!apply) {
    const plan = await planRetention();
    console.log("[audit-retention] dry run — nothing will be removed");
    console.log(`  records total   : ${plan.total}`);
    console.log(`  expired         : ${plan.expired}`);
    console.log(`  would remain    : ${plan.kept}`);
    console.log(`  oldest record   : ${plan.oldest ? new Date(plan.oldest).toISOString() : "none"}`);
    console.log(`  cutoff (security): ${plan.cutoffs.security}`);
    console.log(`  cutoff (activity): ${plan.cutoffs.activity}`);
    console.log("[audit-retention] re-run with --apply to archive and dispose");
    return 0;
  }

  const result = await applyRetention({
    dryRun: false,
    batchSize: readNumberFlag("--batch", 5000),
  });

  if (result.blocking_reason) {
    console.error(`[audit-retention] ${result.blocking_reason}`);
    return 1;
  }

  if (result.disposed === 0) {
    console.log(`[audit-retention] nothing to dispose (${result.reason || "empty batch"})`);
    return 0;
  }

  console.log("[audit-retention] disposed");
  console.log(`  records removed : ${result.disposed}`);
  console.log(`  archived to     : s3://${result.archived.bucket}/${result.archived.key}`);
  console.log(`  archived count  : ${result.archived.count}`);
  return 0;
}

main()
  .then(async (code) => {
    await mongoose.disconnect();
    process.exit(code);
  })
  .catch(async (err) => {
    console.error("[audit-retention] failed:", err);
    await mongoose.disconnect();
    process.exit(1);
  });

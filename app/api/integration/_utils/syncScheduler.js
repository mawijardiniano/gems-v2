/* Daily integration jobs: the automatic HRMIS sync and the removal of
   old, never-imported batches (see batchCleanup.js). Started once per
   server process from instrumentation.js; every minute it checks whether
   either is due. The sync only stages a batch: validating, approving and
   migrating stay with a person. */
import { connectDB } from "@/data/lib/db";
import SystemSetting from "@/models/systemSetting";
import { appDateInput, appParts } from "@/data/lib/appTime";
import {
  HRMIS_CONFIG_KEY,
  runHrmisSync,
} from "@/app/api/integration/_utils/hrmisSync";
import { runCleanupIfDue } from "@/app/api/integration/_utils/batchCleanup";

const CHECK_EVERY_MS = 60 * 1000;
const FIRST_CHECK_MS = 30 * 1000;

/**
 * Runs today's scheduled sync when it is due: the schedule is on, an
 * endpoint is set, it is at or past the sync time (Manila), and today's run
 * has not happened. A server that was down at the sync time catches up
 * later the same day. The day is claimed atomically before syncing, so two
 * server processes never both run it.
 * @returns { ran: false, reason } or { ran: true, result }
 */
export async function runScheduledSyncIfDue(now = new Date()) {
  await connectDB();
  const setting = await SystemSetting.findOne({ key: HRMIS_CONFIG_KEY }).lean();
  const config = setting?.value || {};
  if (!config.schedule_enabled) return { ran: false, reason: "off" };
  if (!config.endpoint) return { ran: false, reason: "no_endpoint" };
  if (!config.schedule_set_by) return { ran: false, reason: "no_owner" };

  const [hh, mm] = String(config.schedule_time || "06:00")
    .split(":")
    .map(Number);
  const parts = appParts(now);
  if (parts.hours * 60 + parts.minutes < hh * 60 + mm) {
    return { ran: false, reason: "not_yet" };
  }
  const today = appDateInput(now);
  if (config.last_scheduled_run_on === today) {
    return { ran: false, reason: "done_today" };
  }

  const claimed = await SystemSetting.findOneAndUpdate(
    {
      key: HRMIS_CONFIG_KEY,
      "value.schedule_enabled": true,
      "value.last_scheduled_run_on": { $ne: today },
    },
    { $set: { "value.last_scheduled_run_on": today } },
    { new: true },
  );
  if (!claimed) return { ran: false, reason: "claimed_elsewhere" };

  const result = await runHrmisSync({
    actor: {
      user_id: config.schedule_set_by,
      username: config.schedule_set_by_username || null,
      role: null,
      auth_method: "system",
    },
    scheduled: true,
  });
  return { ran: true, result };
}

/** Starts the minute check once per process. */
export function startSyncScheduler() {
  if (globalThis.__gemsSyncScheduler) return;
  const tick = async () => {
    await runScheduledSyncIfDue().catch((error) => {
      console.error("[integration] scheduled sync check failed:", error.message);
    });
    /* Removal of old, never-imported batches, once a day when turned on. */
    await runCleanupIfDue().catch((error) => {
      console.error("[integration] batch cleanup check failed:", error.message);
    });
  };
  const first = setTimeout(tick, FIRST_CHECK_MS);
  const timer = setInterval(tick, CHECK_EVERY_MS);
  /* The timers never keep the process alive on their own. */
  first.unref?.();
  timer.unref?.();
  globalThis.__gemsSyncScheduler = timer;
}

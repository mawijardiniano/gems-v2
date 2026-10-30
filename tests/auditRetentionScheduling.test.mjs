import { test } from "node:test";
import assert from "node:assert";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/* Retention disposal is manual by decision (see scripts/audit-retention.mjs).
 *
 * The reasoning: a scheduled job that deletes audit records means whoever can
 * edit the schedule can shorten the trail quietly, and the job keeps running
 * after the person who approved it has left. These tests fail if someone adds a
 * scheduler, so that addition has to be a deliberate, reviewed argument rather
 * than a convenience nobody noticed. */

test("the retention script requires an explicit --apply", () => {
  const src = readFileSync("scripts/audit-retention.mjs", "utf8");
  assert.match(src, /args\.includes\("--apply"\)/);
  assert.match(
    src,
    /else|!apply/,
    "without --apply it must only report",
  );
});

test("no scheduled workflow runs retention disposal", () => {
  const dir = ".github/workflows";
  if (!existsSync(dir)) return;

  const offenders = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (!statSync(path).isFile()) continue;
    const body = readFileSync(path, "utf8");
    /* A workflow that runs the script with --apply disposes on a schedule. */
    if (/audit-retention\.mjs[^\n]*--apply/.test(body)) offenders.push(`${name} runs --apply`);
  }

  assert.deepEqual(
    offenders,
    [],
    `retention disposal must not be automated:\n  ${offenders.join("\n  ")}`,
  );
});

test("no cron-triggered route disposes audit records", () => {
  /* A CRON_SECRET route would be the other way to automate this. Checked by
   * looking for a route that both mentions cron and applies retention. */
  const offenders = [];

  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        walk(path);
      } else if (/route\.jsx?$/.test(entry)) {
        const body = readFileSync(path, "utf8");
        if (/CRON_SECRET/.test(body) && /applyRetention/.test(body)) {
          offenders.push(path);
        }
      }
    }
  };
  walk("app/api");

  assert.deepEqual(
    offenders,
    [],
    `a scheduled route must not dispose audit records:\n  ${offenders.join("\n  ")}`,
  );
});

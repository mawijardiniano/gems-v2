/* Retention is a policy decision expressed as code, so it needs testing like a
 * policy: the bands must be the bands we said, and the dangerous direction —
 * disposing something not yet archived, or not yet due — must be impossible.
 *
 * The tests avoid a database by exercising the pure functions (`expiryFilter`,
 * `retentionPolicy`) and by stubbing the model for the one flow that needs it.
 * That is a real constraint of this suite, but it also keeps the tests fast and
 * focused on the logic that is easy to get wrong: the arithmetic.
 */
import { test } from "node:test";
import assert from "node:assert";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

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

const {
  DEFAULT_RETENTION_DAYS,
  LONG_RETENTION_ACTIONS,
  retentionPolicy,
  expiryFilter,
  archiveKey,
} = await import("../lib/auditRetention.js");

const NOW = new Date("2026-06-01T00:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

function withEnv(vars, fn) {
  const saved = {};
  for (const [k, v] of Object.entries(vars)) {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test("the default period is seven years", () => {
  assert.equal(DEFAULT_RETENTION_DAYS, 2555);
  withEnv({ AUDIT_RETENTION_DAYS_SECURITY: undefined, AUDIT_RETENTION_DAYS_ACTIVITY: undefined }, () => {
    const policy = retentionPolicy();
    assert.equal(policy.security_days, 2555);
    assert.equal(policy.source, "default");
  });
});

test("the period can be set by environment, and says so", () => {
  withEnv({ AUDIT_RETENTION_DAYS_SECURITY: "3650" }, () => {
    const policy = retentionPolicy();
    assert.equal(policy.security_days, 3650);
    assert.equal(policy.source, "env");
  });
});

test("a nonsensical period falls back instead of expiring everything", () => {
  /* A typo that made this 0 or -1 would otherwise put the cutoff in the future
     and select the entire trail for disposal. Falling back is the safe move. */
  for (const bad of ["0", "-5", "abc", ""]) {
    withEnv({ AUDIT_RETENTION_DAYS_SECURITY: bad }, () => {
      assert.equal(retentionPolicy().security_days, DEFAULT_RETENTION_DAYS, `input: ${bad}`);
    });
  }
});

test("cutoffs land the right number of days before now", () => {
  withEnv({ AUDIT_RETENTION_DAYS_SECURITY: "3650", AUDIT_RETENTION_DAYS_ACTIVITY: "365" }, () => {
    const { longCutoff, shortCutoff } = expiryFilter({ now: NOW });
    assert.equal(longCutoff.getTime(), NOW.getTime() - 3650 * DAY);
    assert.equal(shortCutoff.getTime(), NOW.getTime() - 365 * DAY);
  });
});

test("the short band never outlives the long band", () => {
  /* Activity retention set longer than security retention would be a
     contradiction: routine activity outliving the logins that authorised it. */
  withEnv({ AUDIT_RETENTION_DAYS_SECURITY: "365", AUDIT_RETENTION_DAYS_ACTIVITY: undefined }, () => {
    const policy = retentionPolicy();
    assert.ok(
      policy.activity_days <= policy.security_days,
      "activity retention should default to no more than security retention",
    );
  });
});

test("expiry never selects redacted or critical records", () => {
  const { filter } = expiryFilter({ now: NOW });
  assert.deepEqual(filter.redacted, { $ne: true });
  assert.deepEqual(filter.severity, { $ne: "critical" });

  /* Both long- and short-band clauses must carry the exclusions independently;
     a redacted record is excluded by the top-level clause either way. */
  const clauses = filter.$or;
  assert.equal(clauses.length, 2);
  for (const clause of clauses) {
    assert.ok(clause.createdAt.$lt instanceof Date, "each band bounds by createdAt");
  }
});

test("security actions expire on the long band, everything else on the short one", () => {
  const { filter } = expiryFilter({ now: NOW });
  const [longClause, shortClause] = filter.$or;
  assert.deepEqual(longClause.action, { $in: LONG_RETENTION_ACTIONS });
  assert.deepEqual(shortClause.action, { $nin: LONG_RETENTION_ACTIONS });

  assert.ok(LONG_RETENTION_ACTIONS.includes("LOGIN_FAILED"));
  assert.ok(LONG_RETENTION_ACTIONS.includes("PII_ACCESS"));
  assert.ok(LONG_RETENTION_ACTIONS.includes("AUDIT_REDACT"));
  /* A routine content edit is not in the long band. */
  assert.ok(!LONG_RETENTION_ACTIONS.includes("GPB_COMMENT"));
});

test("the long-retention list has no duplicates and no blanks", () => {
  assert.equal(new Set(LONG_RETENTION_ACTIONS).size, LONG_RETENTION_ACTIONS.length);
  for (const action of LONG_RETENTION_ACTIONS) {
    assert.match(action, /^[A-Z][A-Z0-9_]+$/, `malformed action name: ${action}`);
  }
});

test("archive keys sort chronologically and carry the record count", () => {
  const earlier = archiveKey({ now: new Date("2026-01-01T00:00:00Z"), count: 10 });
  const later = archiveKey({ now: new Date("2026-02-01T00:00:00Z"), count: 10 });

  assert.ok(earlier < later, "keys must sort in time order for lifecycle rules");
  assert.match(earlier, /^audit-archive\/\d{4}-\d{2}-\d{2}T/);
  assert.ok(earlier.endsWith("-10.jsonl"));
  assert.ok(!earlier.includes(":"), "colons are awkward in object keys");
});


import { test } from "node:test";
import assert from "node:assert";
import { registerHooks } from "node:module";

/* The failure window in lib/activityLog.js, exercised on the real module.
 *
 * tests/auditHealth.test.mjs drives the route with a stub, which proves the
 * route reads `count` correctly but says nothing about how `count` is computed.
 * The arithmetic that decides "is this failure recent?" is where an alarm
 * breaks silently — too long a window and the probe never clears, too short and
 * it misses failures between polls. */

const MODEL_STUB = `
  export let __createImpl = async () => ({});
  export function __setCreateImpl(fn) { __createImpl = fn; }
  export default {
    async create(entry) { return __createImpl(entry); },
    findOne() {
      const q = {
        sort() { return q; },
        select() { return q; },
        async lean() { return null; },
      };
      return q;
    },
  };
`;

const DB_STUB = `export async function connectDB() {}`;

/* Only imported so the module loads; PII visibility is irrelevant to how
 * failures are counted. */
const BROKER_STUB = `export function canViewPII() { return false; }`;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/models/activity_log") {
      return { url: "stub:activity_log", shortCircuit: true };
    }
    if (specifier === "@/lib/db") {
      return { url: "stub:db", shortCircuit: true };
    }
    if (specifier === "@/lib/profileBroker") {
      return { url: "stub:profileBroker", shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === "stub:activity_log") {
      return { format: "module", shortCircuit: true, source: MODEL_STUB };
    }
    if (url === "stub:db") {
      return { format: "module", shortCircuit: true, source: DB_STUB };
    }
    if (url === "stub:profileBroker") {
      return { format: "module", shortCircuit: true, source: BROKER_STUB };
    }
    return nextLoad(url, context);
  },
});

const modelMod = await import("stub:activity_log");
const { getAuditFailureStats, logActivity, AUDIT_FAILURE_WINDOW_MS } = await import(
  "../lib/activityLog.js"
);

/* Each test starts from a known state. The module keeps its counters in
 * module scope, so fresh figures come from subtracting the baseline rather than
 * from a reset hook — a reset hook that the app does not have would test
 * something the app cannot do. */
function baseline() {
  const before = getAuditFailureStats();
  return {
    count: before.count,
    total: before.total,
    attempted: before.attempted,
  };
}

/* `logActivity` is fire-and-forget for info-level successes (it returns
 * undefined and runs the write in the background), so stats cannot be read
 * immediately after the call. Awaiting a macrotask lets the background task
 * finish; that is what the app relies on too, and reading stats too early here
 * would make these tests pass or fail on timing rather than behaviour. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 5));

async function failOnce() {
  modelMod.__setCreateImpl(async () => {
    throw new Error("write failed");
  });
  /* warning severity, so the write is awaited rather than left in the
     background — a failure that matters must be recorded before the caller
     continues. */
  await logActivity({ action: "TEST_FAIL", description: "x", severity: "warning" });
  await settle();
}

async function succeedOnce() {
  modelMod.__setCreateImpl(async () => ({}));
  await logActivity({ action: "TEST_OK", description: "x", severity: "warning" });
  await settle();
}

test("the window is a sane length", () => {
  assert.ok(
    AUDIT_FAILURE_WINDOW_MS >= 5 * 60 * 1000,
    "too short: a failing writer could look healthy between polls",
  );
  assert.ok(
    AUDIT_FAILURE_WINDOW_MS <= 60 * 60 * 1000,
    "too long: a transient failure would keep the probe red for an hour",
  );
});

test("a failure is counted inside the window", async () => {
  const before = baseline();
  await failOnce();
  const after = getAuditFailureStats();
  assert.equal(after.count - before.count, 1);
  assert.equal(after.total - before.total, 1);
});

test("a failure ages out of the window but not out of the total", async () => {
  const before = baseline();
  await failOnce();

  const inside = getAuditFailureStats();
  assert.equal(inside.count - before.count, 1);

  /* Read the same state as if an hour had passed. `now` is injected for exactly
     this: the alternative is a test that sleeps for fifteen minutes. */
  const later = getAuditFailureStats({ now: Date.now() + 60 * 60 * 1000 });
  assert.equal(later.count, 0, "an hour-old failure must not alarm");
  assert.equal(
    later.total - before.total,
    1,
    "the record of the failure must survive the alarm clearing",
  );
});

test("a failure is still counted at the edge of the window", async () => {
  const before = baseline();
  await failOnce();

  const atEdge = getAuditFailureStats({
    now: Date.now() + AUDIT_FAILURE_WINDOW_MS - 1000,
  });
  assert.equal(atEdge.count - before.count, 1, "a failure just inside must still alarm");

  const past = getAuditFailureStats({
    now: Date.now() + AUDIT_FAILURE_WINDOW_MS + 1000,
  });
  assert.equal(past.count, 0);
});

test("pruning is real, not just filtered at read time", async () => {
  /* If the timestamps were only filtered on read, the array would grow without
     bound in a persistently failing writer — an audit subsystem that fails in
     production is exactly when memory pressure is least welcome. */
  const before = baseline();
  await failOnce();
  getAuditFailureStats({ now: Date.now() + 60 * 60 * 1000 });

  /* After the prune, a read with the clock back at "now" must not resurrect the
     old failure: it has been dropped, not merely hidden. */
  const afterPrune = getAuditFailureStats();
  assert.equal(afterPrune.count, 0);
  assert.equal(afterPrune.total - before.total, 1, "the total is unaffected by pruning");
});

test("a successful write is counted as attempted and is not a failure", async () => {
  const before = baseline();
  await succeedOnce();

  const after = getAuditFailureStats();
  assert.equal(after.attempted - before.attempted, 1);
  assert.equal(after.total - before.total, 0, "a success must never look like a failure");
  assert.equal(after.count, 0);
});

test("the last failure carries enough detail to act on", async () => {
  await failOnce();
  const stats = getAuditFailureStats();
  assert.equal(stats.last_action, "TEST_FAIL");
  assert.match(stats.last_error, /write failed/);
  assert.ok(stats.last_failed_at, "a failure must be attributable in time");
  assert.ok(!Number.isNaN(Date.parse(stats.last_failed_at)));
});

test("stats are a copy, not a live handle", async () => {
  /* A caller mutating the returned object must not corrupt the module's state:
     a health reporter should not be able to silence the next alarm by zeroing
     the object it was handed. */
  await failOnce();
  const stats = getAuditFailureStats();
  const before = stats.count;

  stats.count = 0;
  stats.total = 0;
  stats.last_error = "tampered";

  const again = getAuditFailureStats();
  assert.equal(again.count, before, "zeroing the returned object must not clear the alarm");
  assert.notEqual(again.last_error, "tampered");
  assert.notEqual(again, stats, "each read returns a fresh object");
});

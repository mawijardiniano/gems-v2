/* The audit trail is append-only, and this test is the proof.
 *
 * This file exists because the first implementation of the guard looked
 * correct, read correctly, and did nothing. A mongoose pre-hook that *returns*
 * an Error is silently ignored — only a thrown error aborts the operation — so
 * every delete and update was allowed through while the code appeared to forbid
 * it. Nothing failed; the guard was simply not there.
 *
 * That is the failure mode this test is built to catch: not "is there a hook",
 * but "does the operation actually fail". Each assertion drives a real mongoose
 * call and requires it to reject with AUDIT_LOG_IMMUTABLE. If the guard is ever
 * weakened, removed, or converted back to a returned Error, these go red.
 *
 * No database is needed: the pre-hook runs before the driver touches the wire,
 * so a blocked call rejects immediately. A call that is *not* blocked instead
 * hangs on driver buffering, which is why the timeout below is generous.
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
        if (existsSync(fileURLToPath(candidate))) {
          return nextResolve(candidate, context);
        }
      }
    }
    return nextResolve(specifier, context);
  },
});

const { default: ActivityLog } = await import("../models/activity_log.js");

/** Asserts `operation` rejects with the immutability guard. */
async function assertBlocked(operation) {
  try {
    await operation();
  } catch (err) {
    assert.equal(
      err.code,
      "AUDIT_LOG_IMMUTABLE",
      `expected AUDIT_LOG_IMMUTABLE, got: ${err.code || err.message}`,
    );
    return;
  }
  assert.fail("operation was allowed to run — the append-only guard is not active");
}

test("model-level update operations are rejected", async () => {
  await assertBlocked(() => ActivityLog.updateOne({}, { action: "tampered" }));
  await assertBlocked(() => ActivityLog.updateMany({}, { action: "tampered" }));
  await assertBlocked(() => ActivityLog.replaceOne({}, { action: "tampered" }));
  await assertBlocked(() =>
    ActivityLog.findOneAndUpdate({}, { action: "tampered" }),
  );
  await assertBlocked(() =>
    ActivityLog.findOneAndReplace({}, { action: "tampered" }),
  );
});

test("model-level delete operations are rejected", async () => {
  await assertBlocked(() => ActivityLog.deleteOne({}));
  await assertBlocked(() => ActivityLog.deleteMany({}));
  await assertBlocked(() => ActivityLog.findOneAndDelete({}));
});

test("deleting or saving an existing record is rejected", async () => {
  const doc = new ActivityLog({ action: "ORIGINAL" });
  /* Pretend it came from the database: `save()` on a new document inserts,
     which must stay allowed, but on a loaded one it updates. */
  doc.isNew = false;

  await assertBlocked(() => doc.deleteOne());
  await assertBlocked(() => doc.save());
});

test("the raw driver collection stays writable, so redaction is still possible", () => {
  /* redactActivityLog() writes through `collection` precisely to bypass these
     guards. If that escape hatch ever disappears, lawful redaction becomes
     impossible and the only remaining option is deletion — which is worse. */
  assert.equal(typeof ActivityLog.collection.updateOne, "function");
});

test("inserting a new record is not blocked", () => {
  /* `create`/`save` on a new document must remain permitted, or nothing could
     ever be logged. Checked via validation rather than a write: no database. */
  const doc = new ActivityLog({
    action: "LOGIN_FAILED",
    user_id: null,
    actor: { username: "ghost", auth_method: "none" },
  });
  assert.doesNotThrow(() => doc.validateSync());
});

test("an anonymous actor is valid — unknown-username logins must be recordable", () => {
  /* The schema once required user_id, which made the most investigated event of
     all — attempts against a nonexistent account — impossible to store. The
     write failed validation and was swallowed. */
  const doc = new ActivityLog({
    user_id: null,
    actor: { username: "does-not-exist", auth_method: "none" },
    action: "LOGIN_FAILED",
    severity: "warning",
    outcome: { result: "failure", status_code: 401 },
  });
  assert.doesNotThrow(() => doc.validateSync());
  assert.equal(doc.user_id, null);
  assert.equal(doc.outcome.result, "failure");
});

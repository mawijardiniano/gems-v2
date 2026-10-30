import { test, beforeEach } from "node:test";
import assert from "node:assert";
import jwt from "jsonwebtoken";
import { registerHooks } from "node:module";

/* /api/activity/health is the NIST AU-5 liveness signal: it turns "the audit
 * writer is failing" into something a monitor can poll. An alarm path that is
 * never exercised is the one that fails silently, so it is tested here. */

const JWT_SECRET = "test-secret";

const REQUEST_STUB = `
  export class NextResponse {
    static json(body, init = {}) {
      return { body, status: init.status ?? 200 };
    }
  }
`;

const DB_STUB = `
  export async function connectDB() {}
`;

const ACTIVITYLOG_STUB = `
  /* Mirrors getAuditFailureStats: count is the in-window figure, total the
     since-boot one. */
  export const AUDIT_FAILURE_WINDOW_MS = 15 * 60 * 1000;
  export let stats = {
    count: 0, total: 0, attempted: 0, window_ms: AUDIT_FAILURE_WINDOW_MS,
    last_error: null, last_failed_at: null, last_action: null,
  };
  export function __setStats(next) { stats = { ...stats, ...next }; }
  export function getAuditFailureStats() { return { ...stats }; }
`;

const RETENTION_STUB = `
  export function retentionPolicy() {
    return { security_days: 2555, activity_days: 730, source: "default" };
  }
  export let failPlan = false;
  export function __setFailPlan(v) { failPlan = v; }
  export async function planRetention() {
    if (failPlan) throw new Error("retention unavailable");
    return { total: 10, expired: 2, kept: 8, oldest: null, cutoffs: {} };
  }
`;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/server") {
      return { url: "stub:next-server", shortCircuit: true };
    }
    if (specifier === "@/lib/db") {
      return { url: "stub:db", shortCircuit: true };
    }
    if (specifier === "@/lib/activityLog") {
      return { url: "stub:activityLog", shortCircuit: true };
    }
    if (specifier === "@/lib/auditRetention") {
      return { url: "stub:auditRetention", shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === "stub:next-server") {
      return { format: "module", shortCircuit: true, source: REQUEST_STUB };
    }
    if (url === "stub:db") {
      return { format: "module", shortCircuit: true, source: DB_STUB };
    }
    if (url === "stub:activityLog") {
      return { format: "module", shortCircuit: true, source: ACTIVITYLOG_STUB };
    }
    if (url === "stub:auditRetention") {
      return { format: "module", shortCircuit: true, source: RETENTION_STUB };
    }
    return nextLoad(url, context);
  },
});

process.env.JWT_SECRET = JWT_SECRET;

const logStub = await import("stub:activityLog");
const retentionStub = await import("stub:auditRetention");
const { GET } = await import("../app/api/activity/health/route.js");

function tokenFor(role) {
  return jwt.sign({ id: "u1", username: "someone", role }, JWT_SECRET);
}

async function callHealth({ token } = {}) {
  const req = {
    cookies: {
      get: (name) => (name === "auth_token" && token ? { value: token } : undefined),
    },
  };
  return GET(req);
}

beforeEach(() => {
  logStub.__setStats({
    count: 0,
    total: 0,
    attempted: 0,
    last_error: null,
    last_failed_at: null,
    last_action: null,
  });
  retentionStub.__setFailPlan(false);
});

test("an anonymous caller cannot read audit health", async () => {
  const res = await callHealth({});
  assert.equal(res.status, 401);
});

test("a non-admin caller cannot read audit health", async () => {
  const res = await callHealth({ token: tokenFor("Staff") });
  assert.equal(res.status, 403);
});

test("a forged token is rejected", async () => {
  const forged = jwt.sign({ role: "Admin" }, "wrong-secret");
  const res = await callHealth({ token: forged });
  assert.equal(res.status, 401);
});

test("a quiet trail with no failures reports healthy", async () => {
  const res = await callHealth({ token: tokenFor("Admin") });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "healthy");
  assert.equal(res.body.failures.count, 0);
});

test("write failures degrade the health status and fail the probe", async () => {
  /* The point of this endpoint: a dead audit writer must not look like a quiet
     day. A non-2xx status is what an uptime monitor can actually alarm on. */
  logStub.__setStats({
    count: 3,
    last_error: "connection closed",
    last_failed_at: "2026-01-01T00:00:00.000Z",
    last_action: "LOGIN",
  });

  const res = await callHealth({ token: tokenFor("Admin") });
  assert.equal(res.status, 503);
  assert.equal(res.body.status, "degraded");
  assert.equal(res.body.failures.count, 3);
  assert.equal(res.body.failures.last_action, "LOGIN");
});

test("retention backlog is reported but does not degrade the writer's health", async () => {
  /* A backlog of expired records is an operator's task, not a fault: if it
     degraded the status it would page someone who cannot fix an audit failure. */
  const res = await callHealth({ token: tokenFor("Admin") });
  assert.equal(res.status, 200);
  assert.equal(res.body.retention.due, 2);
  assert.equal(res.body.retention.total, 10);
});

test("a recent failure degrades the probe", async () => {
  logStub.__setStats({
    count: 2,
    total: 2,
    attempted: 10,
    last_error: "connection closed",
    last_failed_at: new Date().toISOString(),
    last_action: "LOGIN",
  });

  const res = await callHealth({ token: tokenFor("Admin") });
  assert.equal(res.status, 503);
  assert.equal(res.body.status, "degraded");
});

test("the probe recovers once failures age out of the window", async () => {
  /* The behaviour this endpoint needs to be usable at all: a transient failure
     must not leave the probe red forever. An alarm that never clears gets
     muted, and a muted alarm is indistinguishable from no alarm. */
  logStub.__setStats({ count: 0, total: 3, attempted: 40, last_failed_at: null });

  const res = await callHealth({ token: tokenFor("Admin") });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "healthy");
});

test("a recovered writer still discloses its past failures", async () => {
  /* Turning green again must not erase the evidence. The window governs the
     alarm; the since-boot total governs the record. If this ever reads 0 the
     probe is hiding a failure rather than recovering from it. */
  logStub.__setStats({ count: 0, total: 3, attempted: 40, last_error: "connection closed" });

  const res = await callHealth({ token: tokenFor("Admin") });
  assert.equal(res.status, 200);
  assert.equal(res.body.failures.total, 3, "past failures must remain visible");
  assert.equal(res.body.failures.last_error, "connection closed");
});

test("the window size is reported so a monitor knows what it is measuring", async () => {
  const res = await callHealth({ token: tokenFor("Admin") });
  assert.equal(res.body.failures.window_ms, 15 * 60 * 1000);
});

test("a retention report that cannot be computed does not hide write failures", async () => {
  /* The more urgent fact must survive the less urgent one failing. */
  logStub.__setStats({ count: 1, last_error: "boom", last_failed_at: null, last_action: "X" });
  retentionStub.__setFailPlan(true);

  const res = await callHealth({ token: tokenFor("Admin") });
  assert.equal(res.status, 503, "a write failure must still degrade the probe");
  assert.equal(res.body.retention.due, null);
  assert.match(res.body.retention.error, /retention unavailable/);
});

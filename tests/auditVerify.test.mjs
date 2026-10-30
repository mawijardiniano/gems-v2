/* Chain verification (NIST AU-9(2)).
 *
 * The verifier is the only part of the audit system whose job is to tell a
 * human something is wrong. That makes two failure directions equally costly:
 *
 *   - It misses real tampering, and we trust a chain that is not intact.
 *   - It reports a break in a clean chain, and operators learn to ignore the
 *     alarm. A verifier nobody trusts is worse than none.
 *
 * The second is the likelier accident: the writer (`linkHash` in
 * lib/activityLog.js) and the verifier each compute the digest over their own
 * projection of the record. If those drift — a reordered key, `null` vs `""`,
 * an ObjectId stringified on one side only — every clean record reports
 * hash_mismatch. So writer/verifier agreement is tested as seriously as
 * tamper detection.
 *
 * The route runs through its real GET handler with the model, the DB connection
 * and next/server stubbed, so the auth gate and the response shape are covered
 * rather than just the hashing.
 */
import { test } from "node:test";
import assert from "node:assert";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import crypto from "node:crypto";

const ROOT = pathToFileURL(process.cwd() + "/").href;

const MODEL_STUB_SOURCE = `
  let rows = [];
  export function __setRows(next) { rows = next; }
  const model = {
    find() {
      const q = {
        sort() { return q; },
        limit(n) { q._limit = n; return q; },
        select() { return q; },
        async lean() {
          const sorted = [...rows].sort(
            (a, b) =>
              a.createdAt - b.createdAt ||
              String(a._id).localeCompare(String(b._id)),
          );
          return q._limit ? sorted.slice(0, q._limit) : sorted;
        },
      };
      return q;
    },
  };
  export default model;
`;

const NEXT_STUB_SOURCE = `
  export const NextResponse = {
    json(body, init = {}) {
      return { status: init.status ?? 200, body, json: async () => body };
    },
  };
  export default { NextResponse };
`;

/* One hook set serves three needs: alias resolution for the app's "@/..." imports,
 * the model stub, and stand-ins for next/server and the DB connection.
 * Registered before any app module loads. */
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/models/activity_log") {
      return { url: "stub:activity_log", shortCircuit: true };
    }
    if (specifier === "next/server") {
      return { url: "stub:next_server", shortCircuit: true };
    }
    if (specifier === "@/lib/db") {
      return { url: "stub:db", shortCircuit: true };
    }
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
  load(url, context, nextLoad) {
    if (url === "stub:activity_log") {
      return { format: "module", shortCircuit: true, source: MODEL_STUB_SOURCE };
    }
    if (url === "stub:next_server") {
      return { format: "module", shortCircuit: true, source: NEXT_STUB_SOURCE };
    }
    if (url === "stub:db") {
      return {
        format: "module",
        shortCircuit: true,
        source: "export async function connectDB() { return true; }",
      };
    }
    return nextLoad(url, context);
  },
});

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-for-audit-verify";

const jwt = (await import("jsonwebtoken")).default;

/* Swaps the fake database contents. The route imports the model once, so the
 * stub holds rows in module scope. */
async function setRows(next) {
  const mod = await import("stub:activity_log");
  mod.__setRows(next);
}

/* Mirrors the route's canonical projection. Duplicated on purpose: the point of
 * the agreement test is to compare the writer's output against an independent
 * verifier, not to import one from the other. */
function canonical(entry) {
  return JSON.stringify({
    action: entry.action,
    changes: entry.changes ?? null,
    created_at: entry.created_at,
    description: entry.description ?? "",
    metadata: entry.metadata ?? null,
    outcome: entry.outcome ?? null,
    resource_id: entry.resource_id ? String(entry.resource_id) : null,
    resource_type: entry.resource_type ?? null,
    severity: entry.severity,
    user_id: entry.user_id ? String(entry.user_id) : null,
  });
}

function seal(entry, prevHash) {
  const hash_self = crypto
    .createHash("sha256")
    .update(`${prevHash || ""}|${canonical(entry)}`)
    .digest("hex");
  return { ...entry, hash_prev: prevHash || null, hash_self };
}

/* Builds a properly chained trail, as the writer would have. */
function buildChain(count, overrides = () => ({})) {
  const out = [];
  let prev = null;
  for (let i = 0; i < count; i += 1) {
    const base = {
      _id: String(i).padStart(24, "0"),
      action: "LOGIN",
      severity: "info",
      user_id: "user-1",
      resource_type: "USER",
      resource_id: null,
      description: `event ${i}`,
      outcome: "success",
      changes: null,
      metadata: null,
      created_at: `2026-01-0${i + 1}T00:00:00.000Z`,
      createdAt: new Date(`2026-01-0${i + 1}T00:00:00.000Z`),
      ...overrides(i),
    };
    const sealed = seal(base, prev);
    prev = sealed.hash_self;
    out.push(sealed);
  }
  return out;
}

const adminToken = () => jwt.sign({ id: "u1", role: "Admin" }, process.env.JWT_SECRET);

async function callVerify({ token, query = "" } = {}) {
  const { GET } = await import("../app/api/activity/verify/route.js");
  const req = {
    url: `http://localhost/api/activity/verify${query}`,
    cookies: {
      get: (name) => (name === "auth_token" && token ? { value: token } : undefined),
    },
  };
  const res = await GET(req);
  return { status: res.status, body: await res.json() };
}

/* ── Auth ───────────────────────────────────────────────────────────────────
 *
 * The chain reveals the whole trail, so it must not be readable by an ordinary
 * user. Both gates are asserted: a route that checks the cookie but not the
 * role hands the trail to anyone who can log in. */
test("an anonymous caller cannot read the chain", async () => {
  await setRows(buildChain(3));
  const { status, body } = await callVerify();
  assert.equal(status, 401);
  assert.match(body.message, /Unauthorized/i);
});

test("a non-admin caller cannot read the chain", async () => {
  await setRows(buildChain(3));
  const token = jwt.sign({ id: "u2", role: "User" }, process.env.JWT_SECRET);
  const { status, body } = await callVerify({ token });
  assert.equal(status, 403);
  assert.match(body.message, /Admin/i);
});

test("a forged token is not accepted as an admin", async () => {
  await setRows(buildChain(3));
  const forged = jwt.sign({ id: "u3", role: "Admin" }, "wrong-secret");
  const { status } = await callVerify({ token: forged });
  assert.equal(status, 401);
});

/* ── Clean chain ────────────────────────────────────────────────────────────
 *
 * The baseline. If this fails, the false-alarm risk described at the top of
 * this file has already materialised. */
test("an intact chain verifies as intact", async () => {
  await setRows(buildChain(5));
  const { status, body } = await callVerify({ token: adminToken() });
  assert.equal(status, 200);
  assert.equal(body.status, "intact");
  assert.equal(body.checked, 5);
  assert.equal(body.unlinked, 0);
  assert.deepEqual(body.problems, []);
});

test("an empty trail is intact, not a failure", async () => {
  await setRows([]);
  const { status, body } = await callVerify({ token: adminToken() });
  assert.equal(status, 200);
  assert.equal(body.status, "intact");
  assert.equal(body.checked, 0);
  assert.equal(body.unlinked, 0);
});

/* ── Tamper detection ───────────────────────────────────────────────────────
 *
 * These simulate an attacker or a careless DBA working through the raw driver,
 * past the model's guards. The verifier is the only thing between that and a
 * silently rewritten history. */
test("an edited description is reported as a hash mismatch on that record", async () => {
  const chain = buildChain(4);
  chain[2].description = "something else entirely";
  await setRows(chain);

  const { body } = await callVerify({ token: adminToken() });
  assert.equal(body.status, "tampered");
  assert.equal(body.problems.length, 1);
  assert.equal(body.problems[0].type, "hash_mismatch");
  assert.equal(body.problems[0].id, chain[2]._id);
});

test("editing the actor is detected — the chain covers who, not just what", async () => {
  const chain = buildChain(3);
  chain[1].user_id = "somebody-else";
  await setRows(chain);

  const { body } = await callVerify({ token: adminToken() });
  assert.equal(body.status, "tampered");
  assert.equal(body.problems[0].type, "hash_mismatch");
  assert.equal(body.problems[0].id, chain[1]._id);
});

test("deleting a middle record is reported as a broken link further on", async () => {
  const chain = buildChain(5);
  chain.splice(2, 1);
  await setRows(chain);

  const { body } = await callVerify({ token: adminToken() });
  assert.equal(body.status, "tampered");
  assert.ok(
    body.problems.some((p) => p.type === "link_broken"),
    "removing a record must break the link that pointed at it",
  );
});

test("appending a forged record with a plausible hash is still caught", async () => {
  const chain = buildChain(3);
  /* An attacker who cannot recompute the whole chain can still append: the
     record links to the real tail, so only its own hash exposes it. */
  const tail = chain[chain.length - 1];
  chain.push({
    ...chain[2],
    _id: "9".repeat(24),
    description: "fabricated",
    hash_prev: tail.hash_self,
    hash_self: "f".repeat(64),
  });
  await setRows(chain);

  const { body } = await callVerify({ token: adminToken() });
  assert.equal(body.status, "tampered");
  assert.ok(body.problems.some((p) => p.type === "hash_mismatch"));
});

/* ── Legacy rows ────────────────────────────────────────────────────────────
 *
 * Rows written before the chain existed have hash_self: null. They are counted
 * and reported separately rather than treated as tampering: we genuinely do not
 * know whether they were altered, and calling them tampered would fire the
 * alarm across thousands of legitimate historical rows. */
test("unlinked legacy rows are counted but do not mark the trail tampered", async () => {
  const legacy = {
    _id: "a".repeat(24),
    action: "LOGIN",
    severity: "info",
    user_id: "user-1",
    description: "pre-chain row",
    created_at: "2025-01-01T00:00:00.000Z",
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
    hash_prev: null,
    hash_self: null,
  };
  await setRows([legacy, ...buildChain(3)]);

  const { body } = await callVerify({ token: adminToken() });
  assert.equal(body.unlinked, 1);
  assert.equal(body.status, "intact");
  assert.deepEqual(body.problems, []);
});

/* ── Writer/verifier agreement ──────────────────────────────────────────────
 *
 * The false-alarm guard. If a field is added to one projection and not the
 * other, this fails here rather than in production, where the entire trail
 * would report as tampered. */
test("a record produced by the writer verifies as intact", async () => {
  /* Reproduces the writer's own hashing (linkHash) rather than reusing the
     verifier's projection, which would make the test tautological. */
  const writerCanonical = (e) =>
    JSON.stringify({
      action: e.action,
      changes: e.changes ?? null,
      created_at: e.created_at,
      description: e.description ?? "",
      metadata: e.metadata ?? null,
      outcome: e.outcome ?? null,
      resource_id: e.resource_id ? String(e.resource_id) : null,
      resource_type: e.resource_type ?? null,
      severity: e.severity,
      user_id: e.user_id ? String(e.user_id) : null,
    });

  /* Shaped like what logActivity() actually builds: an ObjectId-style
     resource_id, explicit nulls, and an anonymous actor. */
  const written = {
    action: "PROFILE_UPDATE",
    severity: "info",
    user_id: null,
    resource_type: "PROFILE",
    resource_id: "64b7f0c2e1a2b3c4d5e6f708",
    description: "Updated profile fields",
    outcome: "success",
    changes: [{ field: "contact.number", before: "0917", after: "0918" }],
    metadata: { route: "/api/profiles/1" },
    created_at: "2026-02-01T00:00:00.000Z",
  };
  const hash_self = crypto
    .createHash("sha256")
    .update(`|${writerCanonical(written)}`)
    .digest("hex");

  await setRows([
    {
      ...written,
      _id: "b".repeat(24),
      createdAt: new Date(written.created_at),
      hash_prev: null,
      hash_self,
    },
  ]);

  const { body } = await callVerify({ token: adminToken() });
  assert.equal(body.status, "intact", "writer and verifier projections have drifted");
  assert.equal(body.checked, 1);
});

/* ── Paging ─────────────────────────────────────────────────────────────────
 *
 * `truncated` is what stops an operator reading "intact" as "the whole trail is
 * intact" when only the first page was checked. */
test("a truncated run says so instead of implying the whole chain was checked", async () => {
  await setRows(buildChain(6));
  const { body } = await callVerify({ token: adminToken(), query: "?limit=3" });
  assert.equal(body.checked, 3);
  assert.equal(body.truncated, true);
});

test("an untruncated run does not claim to be truncated", async () => {
  await setRows(buildChain(3));
  const { body } = await callVerify({ token: adminToken(), query: "?limit=100" });
  assert.equal(body.checked, 3);
  assert.equal(body.truncated, false);
});

/* ── Retention boundary ─────────────────────────────────────────────────────
 *
 * Retention deletes expired records, which necessarily breaks the link held by
 * the oldest surviving record. That break is caused by our own policy job, so
 * reporting it as tampering would teach operators to ignore the alarm.
 *
 * It is recognised only when a disposal entry names that exact predecessor
 * hash — the exemption is evidence-based, never a blanket "gaps are fine". */

/* A disposal entry as applyRetention() writes it, with no hash chain of its own
   (it is not what is under test here). */
function disposalEntry(disposedHash) {
  return {
    _id: "d".repeat(24),
    action: "AUDIT_RETENTION_DISPOSE",
    severity: "critical",
    user_id: null,
    resource_type: "AUDIT_LOG",
    description: "Retention disposed records after archiving",
    outcome: "success",
    changes: null,
    metadata: { disposed_through: disposedHash, count: 3 },
    created_at: "2026-01-01T00:00:00.000Z",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    hash_prev: null,
    hash_self: null,
  };
}

/* Survivors whose first record links back to a hash no longer in the database.
   The rest of the chain is sealed normally, so the only defect is the boundary. */
function survivorsAfterDisposal(actualPrevHash, count = 4) {
  const rows = [];
  let prev = actualPrevHash;
  for (let i = 0; i < count; i += 1) {
    const base = {
      _id: String(i + 1).padStart(24, "0"),
      action: "LOGIN",
      severity: "info",
      user_id: "user-1",
      resource_type: "USER",
      resource_id: null,
      description: `survivor ${i}`,
      outcome: "success",
      changes: null,
      metadata: null,
      created_at: `2026-02-0${i + 1}T00:00:00.000Z`,
      createdAt: new Date(`2026-02-0${i + 1}T00:00:00.000Z`),
    };
    const sealed = seal(base, prev);
    prev = sealed.hash_self;
    rows.push(sealed);
  }
  return rows;
}

test("a documented retention boundary is not reported as tampering", async () => {
  const disposedHash = "c".repeat(64);
  await setRows([
    disposalEntry(disposedHash),
    ...survivorsAfterDisposal(disposedHash),
  ]);

  const { body } = await callVerify({ token: adminToken() });
  assert.equal(body.status, "intact");
  assert.equal(body.archived, 1, "the boundary should be counted as archived");
  assert.deepEqual(body.problems, []);
});

test("an undocumented gap still alarms — the exemption is not a blanket", async () => {
  /* Same shape, but the surviving record points at a hash no disposal named. */
  await setRows([
    disposalEntry("c".repeat(64)),
    ...survivorsAfterDisposal("e".repeat(64)),
  ]);

  const { body } = await callVerify({ token: adminToken() });
  assert.equal(body.status, "tampered");
  assert.ok(body.problems.some((p) => p.type === "link_broken"));
  assert.equal(body.archived, 0);
});


import { test } from "node:test";
import assert from "node:assert";
import jwt from "jsonwebtoken";
import { registerHooks } from "node:module";

/* `verify` must not report a bare "N unlinked".
 *
 * An unlinked row is either history (written before the chain existed) or a
 * symptom (linking failed, so the writer was degraded). An auditor who sees only
 * the total cannot tell which, and the second is the one that matters. */

const JWT_SECRET = "test-secret";

const REQUEST_STUB = `
  export class NextResponse {
    static json(body, init = {}) { return { body, status: init.status ?? 200 }; }
  }
`;
const DB_STUB = `export async function connectDB() {}`;

const MODEL_STUB = `
  export let __rows = [];
  export function __seed(rows) { __rows = rows; }
  export default {
    find() {
      const q = {
        sort() { return q; },
        limit() { return q; },
        select() { return q; },
        async lean() { return __rows; },
      };
      return q;
    },
  };
`;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/server") return { url: "stub:next-server", shortCircuit: true };
    if (specifier === "@/lib/db") return { url: "stub:db", shortCircuit: true };
    if (specifier === "@/models/activity_log") return { url: "stub:model", shortCircuit: true };
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === "stub:next-server") return { format: "module", shortCircuit: true, source: REQUEST_STUB };
    if (url === "stub:db") return { format: "module", shortCircuit: true, source: DB_STUB };
    if (url === "stub:model") return { format: "module", shortCircuit: true, source: MODEL_STUB };
    return nextLoad(url, context);
  },
});

process.env.JWT_SECRET = JWT_SECRET;

const modelMod = await import("stub:model");
const { GET } = await import("../app/api/activity/verify/route.js");

const TOKEN = jwt.sign({ id: "u1", username: "admin", role: "Admin" }, JWT_SECRET);

async function verify() {
  const req = {
    url: "http://localhost/api/activity/verify",
    cookies: { get: (n) => (n === "auth_token" ? { value: TOKEN } : undefined) },
  };
  return GET(req);
}

/* A legacy row: unlinked, with no explanation attached. */
function legacyRow(i) {
  return {
    _id: `legacy${i}`,
    action: "LOGIN",
    severity: "info",
    created_at: "2019-01-01T00:00:00.000Z",
    createdAt: "2019-01-01T00:00:00.000Z",
    hash_prev: null,
    hash_self: null,
  };
}

/* A row whose linking failed: the writer recorded why. */
function degradedRow(i) {
  return {
    _id: `degraded${i}`,
    action: "GPB_UPDATE",
    severity: "warning",
    created_at: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    hash_prev: null,
    hash_self: null,
    metadata: { link_error: "connection closed" },
  };
}

test("legacy and degraded unlinked rows are counted separately", async () => {
  modelMod.__seed([legacyRow(1), legacyRow(2), degradedRow(3)]);

  const res = await verify();
  assert.equal(res.body.unlinked_legacy, 2);
  assert.equal(res.body.unlinked_degraded, 1);
  assert.equal(res.body.unlinked, 3, "the total must still be available");
});

test("a degraded writer is reported as a problem, not as benign history", async () => {
  /* This is the whole point of the split: 3 unlinked rows where one is a
     symptom must not read the same as 3 rows of ancient history. */
  modelMod.__seed([legacyRow(1), degradedRow(2)]);

  const res = await verify();
  assert.equal(res.body.status, "tampered");
  const degraded = res.body.problems.filter((p) => p.type === "writer_degraded");
  assert.equal(degraded.length, 1);
  assert.equal(degraded[0].id, "degraded2");
  assert.match(degraded[0].detail, /connection closed/, "the cause must survive to the report");
});

test("legacy rows alone leave the trail intact", async () => {
  /* Unchanged behaviour, kept deliberately: pre-chain history is not tampering.
     A backfill would attach an integrity claim to rows nobody verified. */
  modelMod.__seed([legacyRow(1), legacyRow(2)]);

  const res = await verify();
  assert.equal(res.body.status, "intact");
  assert.equal(res.body.unlinked_legacy, 2);
  assert.equal(res.body.unlinked_degraded, 0);
  assert.deepEqual(res.body.problems, []);
});

test("the writer records why a row could not be linked", async () => {
  /* The split depends on this marker existing. If the writer stops recording
     it, every degraded row silently becomes "legacy history" again. */
  const src = (await import("node:fs")).readFileSync(
    "lib/activityLog.js",
    "utf8",
  );
  const catchBlock = src.slice(src.indexOf("async function linkHash"));
  const body = catchBlock.slice(0, catchBlock.indexOf("\n}\n"));
  assert.match(body, /link_error/, "the linking failure must be persisted");
});

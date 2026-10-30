/* Retention disposal writes its own record, and refuses to destroy anything it
 * has not archived.
 *
 * applyRetention removes rows the verifier will never see again. Afterwards,
 * the only thing distinguishing that from tampering is the
 * `AUDIT_RETENTION_DISPOSE` entry, and the only thing distinguishing it from
 * silent destruction is the archive object it names. Both are load-bearing, so
 * both are asserted here against the real applyRetention code path with the
 * model stubbed at the module boundary.
 */
import { test } from "node:test";
import assert from "node:assert";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = pathToFileURL(process.cwd() + "/").href;

/* The stub records what applyRetention asked the database to do, and captures
 * the entries the audit writer inserts, so the test can assert on both. */
const MODEL_STUB = `
  let rows = [];
  let deleted = null;
  const inserted = [];
  export function __seed(next) { rows = next; }
  export function __deleted() { return deleted; }
  export function __inserted() { return inserted; }
  const model = {
    find() {
      const q = {
        sort() { return q; },
        limit(n) { q._limit = n; return q; },
        async lean() { return q._limit ? rows.slice(0, q._limit) : rows; },
      };
      return q;
    },
    findOne() {
      const q = {
        sort() { return q; },
        select() { return q; },
        async lean() { return rows.length ? rows[rows.length - 1] : null; },
      };
      return q;
    },
    async create(entry) {
      inserted.push(entry);
      return entry;
    },
    async countDocuments(filter = {}) {
      if (filter && filter.__expired) return rows.length;
      return rows.length;
    },
    collection: {
      async deleteMany({ _id }) {
        deleted = _id.$in;
        return { deletedCount: _id.$in.length };
      },
    },
  };
  export default model;
`;


/* Captures what was uploaded, so a test can assert the archive really contains
 * the disposed rows — the whole basis for deleting them. */
const S3_STUB = `
  export const __uploads = [];
  export class PutObjectCommand {
    constructor(input) { this.input = input; }
  }
  export class S3Client {
    constructor(config) { this.config = config; }
    async send(command) {
      __uploads.push({
        bucket: command.input.Bucket,
        key: command.input.Key,
        body: command.input.Body,
      });
      return { $metadata: { httpStatusCode: 200 } };
    }
  }
`;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/models/activity_log") {
      return { url: "stub:activity_log", shortCircuit: true };
    }
    if (specifier === "@aws-sdk/client-s3") {
      return { url: "stub:s3", shortCircuit: true };
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
      return { format: "module", shortCircuit: true, source: MODEL_STUB };
    }
    if (url === "stub:s3") {
      return { format: "module", shortCircuit: true, source: S3_STUB };
    }
    return nextLoad(url, context);
  },
});

const modelMod = await import("stub:activity_log");
const { applyRetention } = await import("../lib/auditRetention.js");

/* An expired record: older than any plausible retention window, and not one of
 * the classes retention refuses to touch (never critical, never redacted). */
function expiredRecord(i, extra = {}) {
  const created = new Date("2015-01-01T00:00:00.000Z");
  return {
    _id: String(i).padStart(24, "0"),
    action: "LOGIN",
    severity: "info",
    user_id: "user-1",
    description: `old event ${i}`,
    created_at: created.toISOString(),
    createdAt: created,
    hash_prev: null,
    hash_self: `${i}`.repeat(64).slice(0, 64),
    ...extra,
  };
}

/* Archiving needs S3. Rather than reach the network, the test asserts the
 * refusal path (the important safety property) and, where it needs a disposal
 * to actually happen, uses the same code path with archiving unavailable to
 * confirm nothing is deleted. A live-S3 success path belongs in an integration
 * test, not here. */
function withoutS3(fn) {
  const saved = {
    AWS_REGION: process.env.AWS_REGION,
    AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME,
  };
  delete process.env.AWS_REGION;
  delete process.env.AWS_BUCKET_NAME;
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test("with no archive available, nothing is deleted", async () => {
  modelMod.__seed([expiredRecord(1), expiredRecord(2), expiredRecord(3)]);

  const result = await withoutS3(() => applyRetention({ dryRun: false }));

  assert.equal(result.disposed, 0);
  assert.ok(result.blocking_reason, "the refusal must say why");
  assert.match(result.blocking_reason, /archiving is unavailable/i);
  assert.equal(modelMod.__deleted(), null, "no delete may reach the database");
});

test("a dry run plans but never writes or deletes", async () => {
  modelMod.__seed([expiredRecord(1)]);

  const result = await applyRetention({ dryRun: true });
  assert.equal(result.dryRun, true);
  assert.equal(modelMod.__deleted(), null);
  assert.equal(modelMod.__inserted().length, 0, "a dry run must not record a disposal");
});

test("a disposal record is never written when disposal did not happen", async () => {
  /* The dangerous inverse: recording a disposal we did not carry out would tell
   * the verifier to excuse a gap that retention did not create. */
  modelMod.__seed([expiredRecord(1), expiredRecord(2)]);

  await withoutS3(() => applyRetention({ dryRun: false }));

  const disposals = modelMod.__inserted().filter(
    (e) => e.action === "AUDIT_RETENTION_DISPOSE",
  );
  assert.equal(disposals.length, 0);
});

test("a successful disposal archives first, records it, then deletes exactly what it archived", async () => {
  const s3 = await import("stub:s3");
  s3.__uploads.length = 0;

  const expired = [expiredRecord(1), expiredRecord(2)];
  modelMod.__seed(expired);

  process.env.AWS_REGION = "ap-southeast-1";
  process.env.AWS_BUCKET_NAME = "gems-audit-archive";
  let result;
  try {
    result = await applyRetention({ dryRun: false });
  } finally {
    delete process.env.AWS_REGION;
    delete process.env.AWS_BUCKET_NAME;
  }

  assert.equal(result.disposed, 2);

  /* 1. Everything deleted was archived — the archive is the record now. */
  assert.equal(s3.__uploads.length, 1);
  const archivedLines = s3.__uploads[0].body.trim().split("\n").map((l) => JSON.parse(l));
  assert.deepEqual(
    archivedLines.map((r) => String(r._id)),
    expired.map((r) => String(r._id)),
  );

  /* 2. Only the archived ids were deleted. */
  assert.deepEqual(
    modelMod.__deleted().map(String),
    expired.map((r) => String(r._id)),
  );

  /* 3. The disposal is recorded, and names the archive and the exact
        predecessor hash, which is what lets verify() excuse the resulting gap. */
  const disposals = modelMod.__inserted().filter(
    (e) => e.action === "AUDIT_RETENTION_DISPOSE",
  );
  assert.equal(disposals.length, 1, "disposal must leave a record");
  const [disposal] = disposals;
  assert.equal(disposal.metadata.archive_key, s3.__uploads[0].key);
  assert.equal(disposal.metadata.archive_bucket, "gems-audit-archive");
  assert.equal(disposal.metadata.count, 2);
  assert.equal(
    disposal.metadata.disposed_through,
    expired[expired.length - 1].hash_self,
    "the boundary must name the last disposed record's hash",
  );
});

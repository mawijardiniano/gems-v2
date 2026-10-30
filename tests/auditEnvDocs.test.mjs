import { test } from "node:test";
import assert from "node:assert";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/* An environment variable that changes retention, archival or disposal but is
 * documented nowhere is worse than one that does not exist: an operator
 * inheriting the system cannot discover that disposal is blocked for want of a
 * bucket, or that the retention period is configurable at all.
 *
 * This checks that every AUDIT_*, AWS_* and PII_* variable the audit code reads
 * is named in .env.example. It is deliberately a name check, not a value check:
 * the point is discoverability. */

const EXAMPLE = ".env.example";

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry !== "node_modules" && !entry.startsWith(".")) walk(path, out);
    } else if (/\.(js|mjs)$/.test(entry)) {
      out.push(path);
    }
  }
  return out;
}

function envVarsReadByAuditCode() {
  const files = [
    "lib/activityLog.js",
    "lib/auditRetention.js",
    "scripts/audit-retention.mjs",
    ...walk("app/api/activity"),
  ];
  const found = new Set();
  for (const file of files) {
    if (!readFileSync(file, "utf8").length) continue;
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
      /* JWT_SECRET is documented in its own section already. */
      found.add(m[1]);
    }
  }
  return [...found].sort();
}

test("every environment variable the audit code reads is documented", () => {
  const example = readFileSync(EXAMPLE, "utf8");
  const vars = envVarsReadByAuditCode();

  const missing = vars.filter((name) => !new RegExp(`\\b${name}\\b`).test(example));

  assert.deepEqual(
    missing,
    [],
    `these are read by the audit code but not documented in ${EXAMPLE}:\n  ${missing.join("\n  ")}`,
  );
});

test("the retention and archive variables are documented", () => {
  const example = readFileSync(EXAMPLE, "utf8");
  for (const name of [
    "AUDIT_RETENTION_DAYS_SECURITY",
    "AUDIT_RETENTION_DAYS_ACTIVITY",
    "AUDIT_ARCHIVE_PREFIX",
    "AWS_REGION",
    "AWS_BUCKET_NAME",
  ]) {
    assert.match(example, new RegExp(name), `${name} must be documented`);
  }
});

test("the documentation says the retention period is provisional", () => {
  /* The single most likely misreading of this system: that seven years is a
     considered legal period rather than a safe placeholder nobody has ruled
     on. Both the code and the operator-facing doc must say so. */
  const example = readFileSync(EXAMPLE, "utf8");
  const code = readFileSync("lib/auditRetention.js", "utf8");

  assert.match(example, /provisional/i, ".env.example must flag the period as provisional");
  assert.match(code, /provisional/i, "the retention module must flag it too");
  assert.match(example, /DPO|records officer/i, "the doc must say who is to decide");
});

test("the documentation says retention is not scheduled", () => {
  const example = readFileSync(EXAMPLE, "utf8");
  assert.match(example, /not scheduled|deliberately NOT scheduled/i);
});

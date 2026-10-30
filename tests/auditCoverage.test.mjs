/* Audit coverage is a policy, not a habit.
 *
 * The review that led to this test found roughly half of all mutating API
 * handlers wrote no audit record — not because anyone decided they shouldn't,
 * but because each new route was written by someone thinking about the feature
 * rather than the trail. Nothing failed, so nothing was noticed.
 *
 * This test makes the omission visible at the only moment it is cheap to fix:
 * review. It walks app/api for every exported POST/PUT/PATCH/DELETE handler and
 * requires each to either import the audit helper or appear in AUDIT_EXEMPT
 * with a stated reason. Adding `export async function DELETE` to a route now
 * fails the build until its author decides, explicitly, whether the act is
 * auditable.
 *
 * It is a static check on purpose: it cannot tell whether the logActivity call
 * is correct, only that the route's author considered the question. Catching
 * the missing call is the part that used to go wrong.
 */
import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API_DIR = path.join(ROOT, "app", "api");

const MUTATING = ["POST", "PUT", "PATCH", "DELETE"];
const AUDIT_IMPORT = /from\s+["']@\/lib\/activityLog["']/;

/* Routes that mutate state without an audit record, and why.
 *
 * Every entry is a claim that the act carries no accountability weight. If a
 * later change makes one of these consequential, the reason must be rewritten —
 * which is the point. A bare name in this list should never be added to make a
 * test go green. */
const AUDIT_EXEMPT = {
  "app/api/profile/check-id/route.js":
    "Public registration probe: answers whether an ID exists, with no session available to attribute it to and PII as its input. Enumeration is bounded by per-IP rate limiting instead of logged.",
  "app/api/notifications/[id]/read/route.js":
    "Read receipt for the caller's own notification. Preference, not a record or permission.",
  "app/api/upload/route.js":
    "Generic file upload to object storage. Acts are audited at the domain routes that attach the file to a record.",
  "app/api/events/generate-description/route.js":
    "Model-assisted text generation. Returns a proposal to the client; persists nothing.",
  "app/api/events/generate-narrative/route.js":
    "Model-assisted text generation. Returns a proposal to the client; persists nothing.",
};

function walk(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, found);
    else if (entry.name === "route.js") found.push(full);
  }
  return found;
}

function exportedMutatingHandlers(source) {
  return MUTATING.filter((verb) =>
    new RegExp(`export\\s+async\\s+function\\s+${verb}\\b`).test(source),
  );
}

const routeFiles = walk(API_DIR);

test("app/api contains route files to check", () => {
  assert.ok(routeFiles.length > 20, `expected many routes, found ${routeFiles.length}`);
});

test("every mutating route either audits or is explicitly exempt", () => {
  const offenders = [];

  for (const file of routeFiles) {
    const source = fs.readFileSync(file, "utf8");
    const verbs = exportedMutatingHandlers(source);
    if (verbs.length === 0) continue;

    const rel = path.relative(ROOT, file).split(path.sep).join("/");
    const exempt = Object.hasOwn(AUDIT_EXEMPT, rel);
    const importsAudit = AUDIT_IMPORT.test(source);

    /* The exemption list must not outlive the route, or it silently loses its
       meaning and invites reuse. A stale entry fails here. */
    if (exempt && !importsAudit && verbs.length === 0) {
      offenders.push(`${rel}: stale exemption (no mutating handler)`);
      continue;
    }

    if (!importsAudit && !exempt) {
      offenders.push(`${rel}: ${verbs.join("/")} with no audit import`);
    }

    /* An exempt route that later gains audit coverage should lose its entry,
       otherwise the list misrepresents the codebase. */
    if (exempt && importsAudit) {
      offenders.push(`${rel}: exempt but already audits — remove from AUDIT_EXEMPT`);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `Mutating routes must import @/lib/activityLog or be listed in AUDIT_EXEMPT:\n  ${offenders.join("\n  ")}`,
  );
});

test("AUDIT_EXEMPT entries reference routes that exist", () => {
  const known = new Set(
    routeFiles.map((f) => path.relative(ROOT, f).split(path.sep).join("/")),
  );
  for (const rel of Object.keys(AUDIT_EXEMPT)) {
    assert.ok(known.has(rel), `AUDIT_EXEMPT names a route that does not exist: ${rel}`);
  }
});

test("every AUDIT_EXEMPT entry states a reason", () => {
  for (const [rel, reason] of Object.entries(AUDIT_EXEMPT)) {
    assert.ok(
      typeof reason === "string" && reason.trim().length >= 20,
      `AUDIT_EXEMPT["${rel}"] must explain why the act is not auditable`,
    );
  }
});

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
 * Keyed by route, then by verb: an exemption is a claim about ONE act, not a
 * licence for every handler in the file. `positions/[id]` DELETE is exemptable
 * precisely because it removes nothing; that says nothing about its PATCH, which
 * must still audit.
 *
 * Every entry is a claim that the act carries no accountability weight. If a
 * later change makes one of these consequential, the reason must be rewritten —
 * which is the point. A bare name in this list should never be added to make a
 * test go green. */
const AUDIT_EXEMPT = {
  "app/api/profile/check-id/route.js": {
    POST: "Public registration probe: answers whether an ID exists, with no session available to attribute it to and PII as its input. Enumeration is bounded by per-IP rate limiting instead of logged.",
  },
  "app/api/notifications/[id]/read/route.js": {
    PATCH: "Read receipt for the caller's own notification. Preference, not a record or permission.",
  },
  "app/api/upload/route.js": {
    POST: "Generic file upload to object storage. Acts are audited at the domain routes that attach the file to a record.",
    DELETE: "Removes a staged object that was never attached to a record; nothing accountable is destroyed.",
  },
  "app/api/events/generate-description/route.js": {
    POST: "Model-assisted text generation. Returns a proposal to the client; persists nothing.",
  },
  "app/api/events/generate-narrative/route.js": {
    POST: "Model-assisted text generation. Returns a proposal to the client; persists nothing.",
  },
  "app/api/positions/[id]/route.js": {
    DELETE: "Refuses: positions are retired via PATCH is_active:false, so this handler removes nothing. If it ever starts deleting, this exemption is void.",
  },
  "app/api/university-offices/[id]/route.js": {
    DELETE: "Refuses: offices are retired via PATCH is_active:false, so this handler removes nothing. If it ever starts deleting, this exemption is void.",
  },
};

/* The source of ONE exported handler, from its declaration to the next one.
 *
 * Handler-level, not file-level: a single `import { logActivity }` at the top of
 * a file proves only that the module can log. It says nothing about which
 * handlers do. That distinction is not academic — `profile/[id]` imported the
 * helper for its PUT and shipped a DELETE that destroyed a user account and
 * their profile while writing no record at all, and a file-level check passed it.
 */
function handlerSource(source, verb) {
  const start = source.search(
    new RegExp(`export\\s+async\\s+function\\s+${verb}\\b`),
  );
  if (start === -1) return null;
  const rest = source.slice(start + 10);
  const next = rest.search(/export\s+(?:async\s+)?function\s+\w+/);
  return next === -1 ? rest : rest.slice(0, next);
}

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

test("every mutating handler either audits or is explicitly exempt", () => {
  const offenders = [];

  for (const file of routeFiles) {
    const source = fs.readFileSync(file, "utf8");
    const verbs = exportedMutatingHandlers(source);
    if (verbs.length === 0) continue;

    const rel = path.relative(ROOT, file).split(path.sep).join("/");
    const exemptions = AUDIT_EXEMPT[rel] || {};
    /* Whether the module *can* log. Used only to make the failure message
       accurate: "no import" and "imported but unused in this handler" are
       different mistakes and deserve different wording. */
    const importsAudit = AUDIT_IMPORT.test(source);

    for (const verb of verbs) {
      const body = handlerSource(source, verb) ?? "";
      /* Either helper counts: logPiiAccess is the correct record for a read
         that reveals personal data, and is itself built on logActivity. */
      const logs = /logActivity\s*\(/.test(body) || /logPiiAccess\s*\(/.test(body);
      const reason = exemptions[verb];

      if (logs && reason) {
        offenders.push(
          `${rel} ${verb}: exempt but already audits — remove the exemption`,
        );
        continue;
      }
      if (logs) continue;

      if (reason) {
        /* An exemption states the act carries no accountability weight, so the
           module need not be able to log at all. Rejecting that here would
           force a dead import purely to satisfy the checker. What matters is
           that exempted code is *named* — and step 5 fails the build when an
           exempted route starts mutating somewhere nobody decided about. */
        continue;
      }

      offenders.push(
        importsAudit
          ? `${rel} ${verb}: imports the audit helper but this handler writes no record`
          : `${rel} ${verb}: no audit record and no exemption`,
      );
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `Every exported POST/PUT/PATCH/DELETE handler must call logActivity/logPiiAccess ` +
      `or carry its own exemption:\n  ${offenders.join("\n  ")}`,
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

test("every AUDIT_EXEMPT entry states a reason and names a real verb", () => {
  for (const [rel, verbs] of Object.entries(AUDIT_EXEMPT)) {
    assert.ok(
      verbs && typeof verbs === "object" && !Array.isArray(verbs),
      `AUDIT_EXEMPT["${rel}"] must map verb → reason`,
    );
    for (const [verb, reason] of Object.entries(verbs)) {
      assert.ok(
        MUTATING.includes(verb),
        `AUDIT_EXEMPT["${rel}"] names "${verb}", which is not a mutating verb`,
      );
      assert.ok(
        typeof reason === "string" && reason.trim().length >= 20,
        `AUDIT_EXEMPT["${rel}"].${verb} must explain why the act is not auditable`,
      );
    }
  }
});

test("an exemption never outlives the handler it excuses", () => {
  const stale = [];
  for (const [rel, verbs] of Object.entries(AUDIT_EXEMPT)) {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) continue; // covered by the existence test
    const source = fs.readFileSync(file, "utf8");
    for (const verb of Object.keys(verbs)) {
      if (handlerSource(source, verb) === null) {
        stale.push(`${rel} ${verb}`);
      }
    }
  }
  assert.deepEqual(
    stale,
    [],
    `These exemptions describe handlers that no longer exist: ${stale.join(", ")}`,
  );
});

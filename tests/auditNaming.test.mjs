import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";

/* What the audit collection is *called* where a human sees it.
 *
 * The collection is an audit trail, not an activity feed: it has a hash chain,
 * field diffs, frozen actor snapshots, immutability guards, redaction with a
 * required reason, retention with archival, and its own integrity verification.
 * Its own model documentation opens with "The audit trail."
 *
 * The UI called it "Activity Logs", which is the name of a disposable feed. That
 * framing invites an administrator to treat evidence as housekeeping — and an
 * auditor arriving to review compliance would reasonably conclude there was no
 * audit trail and go looking for one that already exists.
 *
 * The URL stays /activity-logs: a route is a technical identifier and renaming
 * it would break bookmarks and every reference in the audit-exemption list for
 * no gain. Only what people read is renamed. These tests keep that split
 * deliberate. */

const CONTENT = readFileSync(
  "app/(pages)/(admin)/activity-logs/content.jsx",
  "utf8",
);
const SIDEBAR = readFileSync(
  "app/(pages)/(admin)/components/layout/sidebar.jsx",
  "utf8",
);
const BREADCRUMBS = readFileSync("lib/breadcrumbs.js", "utf8");

test("the sidebar calls it the audit trail", () => {
  assert.match(SIDEBAR, /name:\s*"Audit Trail"/);
  assert.doesNotMatch(SIDEBAR, /name:\s*"Activity Logs"/);
});

test("the breadcrumb calls it the audit trail", () => {
  assert.match(BREADCRUMBS, /"\/activity-logs":\s*"Audit Trail"/);
  assert.doesNotMatch(BREADCRUMBS, /"\/activity-logs":\s*"Activity Logs"/);
});

test("the page heading calls it the audit trail", () => {
  assert.match(CONTENT, /<h1[^>]*>Audit Trail<\/h1>/);
  assert.doesNotMatch(CONTENT, /<h1[^>]*>Activity Logs<\/h1>/);
});

test("the empty and loading states use the same vocabulary", () => {
  /* A page whose heading says "Audit Trail" but whose empty state says "No
     activity logs found" teaches two names for one thing. */
  assert.doesNotMatch(CONTENT, /Loading activity logs/i);
  assert.doesNotMatch(CONTENT, /No activity logs found/i);
  assert.match(CONTENT, /Loading audit records/i);
  assert.match(CONTENT, /No audit records found/i);
});

test("the export filename matches what the user was told it is", () => {
  assert.match(CONTENT, /audit-trail-\$\{/, "exported as audit-trail-<date>.csv");
  assert.doesNotMatch(CONTENT, /activity-logs-\$\{/);
});

test("the redaction dialog names the record, not a log", () => {
  assert.match(CONTENT, /Redact Audit Record/);
  assert.doesNotMatch(CONTENT, /Redact Activity Log/);
});

test("the route is unchanged, on purpose", () => {
  /* The rename is cosmetic by decision: the URL is deliberately left alone so
     no bookmark, exemption entry or log-route reference breaks. */
  assert.match(SIDEBAR, /href:\s*"\/activity-logs"/);
  assert.match(BREADCRUMBS, /"\/activity-logs"/);
  assert.match(CONTENT, /\/api\/activity\b/);
});

test("the model documents itself as an audit trail", () => {
  /* The source of truth for what this collection is. If this ever changes, the
     UI naming above should be revisited with it. */
  const model = readFileSync("models/activity_log.js", "utf8");
  assert.match(model, /The audit trail/);
});

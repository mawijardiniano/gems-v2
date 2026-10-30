import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";

/* The activity-logs page must show an administrator whether the audit trail is
 * intact (NIST AU-9(2)). These are source-inspection tests, the same approach
 * tests/breadcrumbs.routes.test.mjs uses: React is not rendered in this suite,
 * so what is asserted is the *decisions* the panel makes and the facts it must
 * not hide, not its markup. */

const SOURCE = readFileSync(
  "app/(pages)/(admin)/activity-logs/content.jsx",
  "utf8",
);

test("the page offers an integrity check", () => {
  assert.match(SOURCE, /\/api\/activity\/verify/, "must call the verify endpoint");
  assert.match(SOURCE, /Verify integrity|Re-verify/, "must offer the action");
});

test("verification is requested deliberately, not on every page load", () => {
  /* Hashing the whole trail each time an admin opens the table is wasteful and
     turns checking into background noise. The verify call must live in its own
     callback, not in the effect that loads the log page. */
  const verifyBody = SOURCE.slice(
    SOURCE.indexOf("const verifyChain"),
    SOURCE.indexOf("}, []);", SOURCE.indexOf("const verifyChain")),
  );
  assert.match(verifyBody, /\/api\/activity\/verify/);

  const effect = SOURCE.slice(
    SOURCE.indexOf("useEffect(() => {"),
    SOURCE.indexOf("}, [fetchLogs]);"),
  );
  assert.doesNotMatch(
    effect,
    /\/api\/activity\/verify/,
    "loading the page must not also verify the whole chain",
  );
});

test("the result distinguishes intact from tampered", () => {
  assert.match(SOURCE, /integrity\.status === "intact"/);
  assert.match(SOURCE, /text-green-600/);
  assert.match(SOURCE, /text-red-600/);
});

test("retention boundaries are shown, not hidden", () => {
  /* An archived boundary is not tampering, but it is still a fact: it says where
     the older records went. Silently omitting it would make the panel claim a
     complete trail that no longer sits in this collection. */
  const label = SOURCE.indexOf("Retention boundaries");
  assert.notEqual(label, -1, "the panel must name the figure");
  /* The value rendered inside the panel cell. Searched only up to the end of
     that cell so a mention elsewhere in the file cannot satisfy this. */
  const cellEnd = SOURCE.indexOf("</div>", SOURCE.indexOf("font-semibold", label));
  const figure = SOURCE.slice(label, cellEnd);
  assert.match(
    figure,
    /\{integrity\.archived\}/,
    "the boundary count itself must be rendered next to the label",
  );
  assert.match(SOURCE, /retention boundary/);
});

test("unlinked legacy rows are surfaced", () => {
  assert.match(SOURCE, /integrity\.unlinked_legacy/);
});

test("a degraded writer is called out, not folded into legacy history", () => {
  /* The panel must not present "12 unlinked" as if it were all ancient history
     when some of it means the audit writer was broken. */
  assert.match(SOURCE, /integrity\?\.unlinked_degraded > 0/);
  assert.match(SOURCE, /writer_degraded/);
  const idx = SOURCE.indexOf("integrity?.unlinked_degraded > 0");
  const message = SOURCE.slice(idx, idx + 500);
  assert.match(
    message,
    /could not be linked|not working correctly/i,
    "the warning must say what it means",
  );
});

test("individual problems are listed", () => {
  assert.match(SOURCE, /integrity\?\.problems\?\.length > 0/);
  assert.match(SOURCE, /integrity\.problems\.map/);
  assert.match(SOURCE, /p\.type/);
  assert.match(SOURCE, /p\.id/);
});

test("a truncated verification says it did not cover the whole trail", () => {
  /* The most dangerous misreading of this panel is taking a partial check as a
     clean bill of health for the entire history. */
  assert.match(SOURCE, /integrity\?\.truncated/);
  const truncatedIndex = SOURCE.indexOf("integrity?.truncated");
  const message = SOURCE.slice(truncatedIndex, truncatedIndex + 400);
  assert.match(
    message,
    /(did not|not)\s+cover|were not (checked|verified)/i,
    "the message must state that earlier records were not checked",
  );
});

test("a failed request is reported rather than shown as healthy", () => {
  /* An error must never leave the previous "intact" result on screen. */
  assert.match(SOURCE, /setIntegrity\(null\)/);
  assert.match(SOURCE, /integrityError/);
});

test("the summary line reports real counts, not placeholders", () => {
  /* Caught a real regression: a mutation sweep replaced the archived count in
     the summary with a literal 0 and every other test still passed, so the panel
     would have told an administrator "0 retention boundaries" while boundaries
     existed. Assert the interpolations, not just that the sentence exists. */
  const start = SOURCE.indexOf("const integritySummary");
  assert.notEqual(start, -1, "the summary must exist");
  const summary = SOURCE.slice(start, SOURCE.indexOf("})();", start));

  assert.doesNotMatch(summary, /\$\{0\}/, "no hard-coded zero in the summary");
  assert.match(summary, /\$\{integrity\.checked\}/, "must report the real count checked");
  assert.match(
    summary,
    /\$\{integrity\.archived\}/,
    "must report the real boundary count",
  );
  assert.match(
    summary,
    /\$\{integrity\.problems\.length\}/,
    "must report the real problem count",
  );
});

test("no placeholder or disabled branches are left in the panel", () => {
  const panelStart = SOURCE.indexOf("{/* Integrity");
  const panel = SOURCE.slice(panelStart, SOURCE.indexOf("{/* Table */}", panelStart));
  assert.doesNotMatch(panel, /\{false &&/, "a disabled block is dead code, not a decision");
  assert.doesNotMatch(panel, /<div className="font-semibold">[—0-]<\/div>/, "a placeholder stands in for data");
});

test("authorisation failures keep their own wording", () => {
  assert.match(SOURCE, /res\.status === 401/);
  assert.match(SOURCE, /res\.status === 403/);
  assert.match(SOURCE, /Unauthorized/);
  assert.match(SOURCE, /Admin access required/);
});

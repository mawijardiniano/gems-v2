import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";

/* The activity-log table's identity rules.
 *
 * React is not rendered in this suite, so the component is not imported. The
 * function under test is instead *extracted from the real source file* and
 * evaluated, so these tests exercise the shipped code rather than a copy of it.
 * (An earlier version of this file re-implemented the rules in the test and
 * passed happily while the component kept the bug — a test that only agreed
 * with itself. Mutation testing caught it.)
 */

const SOURCE = readFileSync(
  "app/(pages)/(admin)/activity-logs/content.jsx",
  "utf8",
);

/* Pull `function describeActor(log) { ... }` out of the component and evaluate
 * it. Balanced-brace scan rather than a regex, because the body contains
 * braces and template literals. */
function extractFunction(name) {
  const start = SOURCE.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist in the component`);

  const open = SOURCE.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < SOURCE.length; i++) {
    if (SOURCE[i] === "{") depth++;
    else if (SOURCE[i] === "}") {
      depth--;
      if (depth === 0) return SOURCE.slice(start, i + 1);
    }
  }
  throw new Error(`unbalanced braces in ${name}`);
}

const describeActor = new Function(
  `${extractFunction("describeActor")}; return describeActor;`,
)();

test("a username equal to the role is not repeated", () => {
  /* The bug seen in the real data: "Admin · Admin". */
  const actor = describeActor({ actor: { username: "Admin", role: "Admin" } });
  assert.equal(actor.primary, "Admin");
  assert.deepEqual(actor.secondary, [], "the role must not repeat the username");
});

test("a distinct username and role are both shown", () => {
  const actor = describeActor({
    actor: { username: "Focal", role: "GAD Focal Person" },
  });
  assert.equal(actor.primary, "Focal");
  assert.deepEqual(actor.secondary, ["GAD Focal Person"]);
});

test("the de-duplication ignores case", () => {
  const actor = describeActor({ actor: { username: "admin", role: "Admin" } });
  assert.equal(actor.primary, "admin");
  assert.deepEqual(actor.secondary, [], "case alone is not a distinction worth showing");
});

test("a name, when present, leads", () => {
  const actor = describeActor({
    actor: { name: "Ronjie Mar Malinao", username: "MalinaoRonjieMar", role: "Dean" },
  });
  assert.equal(actor.primary, "Ronjie Mar Malinao");
  assert.deepEqual(actor.secondary, ["MalinaoRonjieMar", "Dean"]);
});

test("a missing actor does not fall back to the ObjectId", () => {
  const actor = describeActor({ actor: null, user_id: "69b8f341c2f152716697c120" });
  assert.equal(actor.primary, null, "the table falls back to an em dash, not the ObjectId");
  assert.equal(actor.id, "69b8f341c2f152716697c120", "the id is still available for the detail view");
});

test("an unknown actor still yields an id when there is one", () => {
  const actor = describeActor({ user_id: "abc123" });
  assert.equal(actor.id, "abc123");
  assert.equal(actor.primary, null);
});

test("the ObjectId is not the headline in the table", () => {
  /* Regression guard: the column must render the described actor, not user_id. */
  const tableStart = SOURCE.indexOf("<tbody");
  const table = SOURCE.slice(tableStart, SOURCE.indexOf("</tbody>", tableStart));
  assert.match(table, /actor\.primary/, "the User column must render the human identity");
  assert.doesNotMatch(
    table,
    /text-xs font-mono text-gray-600">\{log\.user_id\}/,
    "the ObjectId must not be the primary text of the identity cell",
  );
});

test("the ObjectId is still reachable", () => {
  /* Removing it from the headline is not removing it: investigations need it. */
  assert.match(SOURCE, /User ID: \$\{actor\.id\}/, "available on hover");
  assert.match(SOURCE, /label="Record ID"/, "and in the detail panel");
});

test("the action colour map has no duplicate keys", () => {
  /* Eight keys were defined twice. Duplicates in an object literal are legal
     JS and the last one silently wins, so a colour set in one place and
     overridden in another looks deliberate when it is drift. Two of them
     disagreed, which means the badge an action rendered depended on which
     block someone happened to edit. */
  const match = /const ACTION_COLORS = \{([\s\S]*?)\n\};/.exec(SOURCE);
  assert.ok(match, "ACTION_COLORS must exist");

  const keys = [...match[1].matchAll(/^\s*([A-Z_]+):/gm)].map((m) => m[1]);
  const seen = new Set();
  const duplicates = [];
  for (const key of keys) {
    if (seen.has(key)) duplicates.push(key);
    seen.add(key);
  }

  assert.deepEqual(duplicates, [], `defined more than once: ${duplicates.join(", ")}`);
});

test("the actions seen in the live log all have a colour", () => {
  /* LOGIN/LOGOUT fall back to grey otherwise, and grey-on-grey is what made
     logouts look like nothing happened. */
  const match = /const ACTION_COLORS = \{([\s\S]*?)\n\};/.exec(SOURCE);
  const body = match[1];
  for (const action of ["LOGIN", "LOGOUT", "LOGIN_FAILED"]) {
    assert.match(body, new RegExp(`^\\s*${action}:`, "m"), `${action} must be styled`);
  }
});

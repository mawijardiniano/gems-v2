import { test } from "node:test";
import assert from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

/* AUDIT-STAGING.md splits two unrelated efforts sitting in the working tree, so
 * the audit work can be reviewed on its own. A staging plan that drifts from
 * reality is worse than none, because someone follows it — so this checks the
 * plan against `git status`.
 *
 * Skipped when the plan is absent (e.g. after it has served its purpose and been
 * deleted) or when git is unavailable. */

const PLAN = "AUDIT-STAGING.md";

function parsePlan() {
  const normalized = readFileSync(PLAN, "utf8").replace(/\r\n/g, "\n");
  return [...normalized.matchAll(/## Group [AB][^\n]*\n+```\n([\s\S]*?)```/g)].map(
    (m) =>
      m[1]
        .split("\n")
        .map((l) => l.replace(/\s+\(.*$/, "").trim())
        .filter(Boolean),
  );
}

test("the staging plan matches the working tree", (t) => {
  if (!existsSync(PLAN)) return t.skip("no staging plan present");

  let status;
  try {
    status = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" });
  } catch {
    return t.skip("git not available");
  }

  const blocks = parsePlan();
  assert.equal(blocks.length, 2, "the plan must define exactly two groups");

  const planned = blocks.flat();
  const changed = status
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => l.slice(3).replace(/^"|"$/g, "").trim())
    .filter((p) => p !== PLAN);

  /* tests/ and scripts/ used to be fully ignored, so they never appeared in git
     status. They are now tracked (via the .gitignore exceptions), so they DO
     appear — and the plan covers them with glob entries rather than one line
     each. A file counts as planned if any entry matches it as a literal path or
     as a glob. */
  const toRegExp = (entry) =>
    new RegExp(
      `^${entry
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, "[^/]*")}$`,
    );

  const plannedRes = planned.map(toRegExp);
  const matches = (p) =>
    plannedRes.some((re) => re.test(p)) ||
    planned.some((q) => p.startsWith(q.replace(/\/$/, "") + "/"));

  const unplanned = changed.filter((p) => !matches(p));
  const stale = planned.filter(
    (p) => !/[*]/.test(p) && !changed.some((c) => c === p || c.startsWith(p.replace(/\/$/, "") + "/")),
  );

  assert.deepEqual(unplanned, [], `changed but not staged in the plan:\n  ${unplanned.join("\n  ")}`);
  assert.deepEqual(stale, [], `in the plan but not changed:\n  ${stale.join("\n  ")}`);
});

test("the two groups do not overlap", (t) => {
  if (!existsSync(PLAN)) return t.skip("no staging plan present");
  const [a, b] = parsePlan();
  const shared = a.filter((p) => b.includes(p));
  assert.deepEqual(shared, [], `a file cannot be committed in both groups:\n  ${shared.join("\n  ")}`);
});

test("the plan warns that tests and scripts are gitignored", () => {
  if (!existsSync(PLAN)) return t.skip("no staging plan present");
  const body = readFileSync(PLAN, "utf8");
  assert.match(body, /gitignored/, "the plan must flag the gitignored directories");
  assert.match(body, /tests\/?/, "must mention tests/");
  assert.match(body, /scripts\/?/, "must mention scripts/");
});

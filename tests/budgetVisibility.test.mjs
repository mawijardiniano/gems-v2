import { test } from "node:test";
import assert from "node:assert";

// Who may see the project monitoring budget figures. A GAD focal person sees
// every office, a GAD coordinator only the college they are assigned to, and
// every other role sees none of the budget — no DB or network required.
import {
  BUDGET_VIEW,
  budgetProjectsFor,
  budgetViewFor,
  canViewProjectBudget,
  isInOwnOffice,
  summarizeBudget,
} from "../lib/budgetVisibility.js";

const project = (offices, extra = {}) => ({
  responsible_office: Array.isArray(offices) ? offices : { value: [offices] },
  ...extra,
});

test("only the focal person and a coordinator get a budget scope", () => {
  assert.strictEqual(budgetViewFor("GAD Focal Person"), BUDGET_VIEW.ALL);
  assert.strictEqual(budgetViewFor("gad focal person"), BUDGET_VIEW.ALL);
  assert.strictEqual(budgetViewFor("GAD Coordinator"), BUDGET_VIEW.OWN_OFFICE);
  assert.strictEqual(budgetViewFor("gad coordinator"), BUDGET_VIEW.OWN_OFFICE);

  ["Dean", "SUC President", "Admin", "Planning Director", "", null, undefined].forEach(
    (role) => {
      assert.strictEqual(
        budgetViewFor(role),
        BUDGET_VIEW.NONE,
        `${role} should not see any budget`,
      );
    },
  );
});

test("a project belongs to the viewer's office through any field shape", () => {
  assert.ok(isInOwnOffice(project(["College of Engineering"]), "College of Engineering"));
  assert.ok(
    isInOwnOffice(
      project(["GAD Unit", "College of Engineering"]),
      "College of Engineering",
    ),
  );
  /* The { value: [...] } shape the API stores, a legacy ampersand spelling and
     a differently cased college all still match. */
  assert.ok(isInOwnOffice(project("College of Engineering"), "college of engineering"));
  assert.ok(
    isInOwnOffice(
      project(["College of Arts & Social Sciences"]),
      "College of Arts and Social Sciences",
    ),
    "the legacy ampersand spelling should match its canonical college",
  );

  assert.strictEqual(isInOwnOffice(project(["College of Education"]), "College of Engineering"), false);
  assert.strictEqual(isInOwnOffice(project(["College of Engineering"]), ""), false);
  assert.strictEqual(isInOwnOffice(project([]), "College of Engineering"), false);
  assert.strictEqual(isInOwnOffice(null, "College of Engineering"), false);
});

test("an approved coordinator college is scoped, everything else is hidden", () => {
  const engineering = project(["College of Engineering"]);
  const education = project(["College of Education"]);

  assert.strictEqual(canViewProjectBudget(BUDGET_VIEW.ALL, engineering, ""), true);
  assert.strictEqual(canViewProjectBudget(BUDGET_VIEW.ALL, education, ""), true);

  assert.strictEqual(
    canViewProjectBudget(BUDGET_VIEW.OWN_OFFICE, engineering, "College of Engineering"),
    true,
  );
  assert.strictEqual(
    canViewProjectBudget(BUDGET_VIEW.OWN_OFFICE, education, "College of Engineering"),
    false,
    "a coordinator must not see another college's budget",
  );
  /* No college on the account means no budget at all, never everything. */
  assert.strictEqual(canViewProjectBudget(BUDGET_VIEW.OWN_OFFICE, engineering, ""), false);

  assert.strictEqual(canViewProjectBudget(BUDGET_VIEW.NONE, engineering, ""), false);
  assert.strictEqual(canViewProjectBudget(BUDGET_VIEW.NONE, education, "College of Engineering"), false);
});

test("budgetProjectsFor keeps only the projects the viewer may total", () => {
  const projects = [
    project(["College of Engineering"]),
    project(["College of Education"]),
    project(["College of Engineering", "GAD Unit"]),
  ];

  assert.strictEqual(budgetProjectsFor(BUDGET_VIEW.ALL, projects, "").length, 3);
  assert.strictEqual(
    budgetProjectsFor(BUDGET_VIEW.OWN_OFFICE, projects, "College of Engineering").length,
    2,
  );
  assert.deepStrictEqual(budgetProjectsFor(BUDGET_VIEW.NONE, projects, ""), []);
  assert.deepStrictEqual(budgetProjectsFor(BUDGET_VIEW.ALL, null, ""), []);
});

test("summarizeBudget totals planned versus actual, including no budget", () => {
  const summary = summarizeBudget([
    { gad_budget: { value: 500000 }, actual_expenditures: 310000 },
    { gad_budget: { value: "250000" }, actual_expenditures: "0" },
    { gad_budget: { value: 0 }, actual_expenditures: 25000 },
  ]);

  assert.strictEqual(summary.totalBudget, 750000);
  assert.strictEqual(summary.totalExpenditures, 335000);
  assert.strictEqual(Math.round(summary.utilization), 45);
});

test("summarizeBudget reports 0% instead of NaN when nothing is budgeted", () => {
  const summary = summarizeBudget([
    { gad_budget: { value: 0 }, actual_expenditures: 12000 },
  ]);

  assert.strictEqual(summary.totalBudget, 0);
  assert.strictEqual(summary.totalExpenditures, 12000);
  assert.strictEqual(summary.utilization, 0);
  assert.ok(Number.isFinite(summary.utilization));

  assert.deepStrictEqual(summarizeBudget([]), {
    totalBudget: 0,
    totalExpenditures: 0,
    utilization: 0,
  });
  assert.deepStrictEqual(summarizeBudget(null), {
    totalBudget: 0,
    totalExpenditures: 0,
    utilization: 0,
  });
});

test("summarizeBudget honours the budget field each module uses", () => {
  /* The Academic and R&E modules store the planned figure in `budget`. */
  const summary = summarizeBudget(
    [{ budget: { value: 100000 }, actual_expenditures: 80000 }],
    "budget",
  );

  assert.strictEqual(summary.totalBudget, 100000);
  assert.strictEqual(Math.round(summary.utilization), 80);
});
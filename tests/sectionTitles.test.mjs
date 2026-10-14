import { test } from "node:test";
import assert from "node:assert";

import {
  EVENT_DEFAULT_TITLE,
  resolveEventSectionTitle,
} from "../lib/sectionTitles.js";

test("navbar titles match sidebar sections", () => {
  assert.strictEqual(resolveEventSectionTitle("/events-dashboard"), "Dashboard");
  assert.strictEqual(
    resolveEventSectionTitle("/project-monitoring/gad-projects"),
    "GAD Projects / Activities",
  );
  assert.strictEqual(
    resolveEventSectionTitle("/project-monitoring"),
    "Project Monitoring",
  );
  assert.strictEqual(
    resolveEventSectionTitle("/gender-statistics/students"),
    "Gender Statistics — Students",
  );
  assert.strictEqual(
    resolveEventSectionTitle("/gender-statistics"),
    "Gender Statistics",
  );
  assert.strictEqual(
    resolveEventSectionTitle("/university-officials"),
    "University Officials",
  );
  assert.strictEqual(resolveEventSectionTitle("/gfps"), "GFPS");
});

test("nested pages resolve to their parent section", () => {
  assert.strictEqual(resolveEventSectionTitle("/gpb/2025"), "GPB 2025");
  assert.strictEqual(
    resolveEventSectionTitle("/gender-statistics/employees/detail"),
    "Gender Statistics — Employees",
  );
  assert.strictEqual(resolveEventSectionTitle("/events/create"), "Events");
});

test("unknown and empty paths fall back to the default title", () => {
  assert.strictEqual(resolveEventSectionTitle("/nope"), EVENT_DEFAULT_TITLE);
  assert.strictEqual(resolveEventSectionTitle(""), EVENT_DEFAULT_TITLE);
  assert.strictEqual(resolveEventSectionTitle(null), EVENT_DEFAULT_TITLE);
});

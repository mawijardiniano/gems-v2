import { test } from "node:test";
import assert from "node:assert";

// GPB status rules: an approved plan is never sent back to draft, neither by the
// workspace status modal nor through the API. No DB or network required.
import {
  GPB_STATUSES,
  canSetGpbStatus,
  gpbStatusOptions,
} from "../lib/gpbStatus.js";

const values = (options) => options.map((option) => option.value);

test("a draft or disapproved GPB may still move to any status", () => {
  ["draft", "disapproved"].forEach((current) => {
    assert.deepStrictEqual(
      values(gpbStatusOptions(current)),
      ["draft", "approved", "disapproved"],
      `${current} should keep every option`,
    );
  });
});

test("a missing or unexpected status stays unlocked", () => {
  [undefined, null, "", "pending"].forEach((current) => {
    assert.deepStrictEqual(
      values(gpbStatusOptions(current)),
      ["draft", "approved", "disapproved"],
      `${current} should not lock the draft option`,
    );
  });
});

test("an approved GPB no longer offers Draft", () => {
  assert.deepStrictEqual(values(gpbStatusOptions("approved")), [
    "approved",
    "disapproved",
  ]);

  /* The stored value is lower case, but a differently cased caller still locks. */
  assert.deepStrictEqual(values(gpbStatusOptions("Approved")), [
    "approved",
    "disapproved",
  ]);
});

test("canSetGpbStatus refuses draft once the GPB is approved", () => {
  assert.strictEqual(canSetGpbStatus("approved", "draft"), false);
  assert.strictEqual(canSetGpbStatus("Approved", "Draft"), false);
  assert.strictEqual(canSetGpbStatus("approved", "approved"), true);
  assert.strictEqual(canSetGpbStatus("approved", "disapproved"), true);
});

test("canSetGpbStatus allows any status while the GPB is not approved", () => {
  ["draft", "disapproved", undefined, ""].forEach((current) => {
    ["draft", "approved", "disapproved"].forEach((next) => {
      assert.strictEqual(
        canSetGpbStatus(current, next),
        true,
        `${current} -> ${next} should be allowed`,
      );
    });
  });
});

test("every status carries the value and label the modal renders", () => {
  assert.deepStrictEqual(values(GPB_STATUSES), [
    "draft",
    "approved",
    "disapproved",
  ]);

  GPB_STATUSES.forEach((status) => {
    assert.ok(status.value, "a status needs a value");
    assert.ok(status.label, `${status.value} needs a label`);
    assert.ok(
      status.label.length > 1 && status.label[0] === status.label[0].toUpperCase(),
      `${status.value} should be shown capitalised`,
    );
  });
});
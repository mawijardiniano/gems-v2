import { test } from "node:test";
import assert from "node:assert";

import {
  DEFAULT_TEXT_SCALE_ID,
  MAX_TEXT_SCALE_PERCENT,
  TEXT_SCALE_PRESETS,
  TEXT_SCALE_STORAGE_KEY,
  applyTextScaleTo,
  isTextScaleId,
  resolveTextScale,
  textScaleFontSize,
  textScaleTriggerLabel,
} from "../lib/textScale.js";

/** Minimal stand-in for `<html>` so the DOM helper runs outside a browser. */
function fakeRoot() {
  return { style: { fontSize: "" } };
}

test("text size presets run from 100% to a 150% ceiling", () => {
  const percents = TEXT_SCALE_PRESETS.map((preset) => preset.percent);

  assert.deepStrictEqual(percents, [100, 112.5, 125, 150]);
  assert.strictEqual(Math.max(...percents), MAX_TEXT_SCALE_PERCENT);
  assert.strictEqual(MAX_TEXT_SCALE_PERCENT, 150);
});

test("text size presets are uniquely identified and labelled", () => {
  const ids = TEXT_SCALE_PRESETS.map((preset) => preset.id);
  const labels = TEXT_SCALE_PRESETS.map((preset) => preset.label);

  assert.strictEqual(new Set(ids).size, ids.length);
  assert.strictEqual(new Set(labels).size, labels.length);
  assert.deepStrictEqual(labels, ["Standard", "Large", "Larger", "Largest"]);
});

test("standard is the default preset", () => {
  assert.strictEqual(DEFAULT_TEXT_SCALE_ID, "standard");
  assert.strictEqual(resolveTextScale(DEFAULT_TEXT_SCALE_ID).percent, 100);
});

test("unknown or missing ids fall back to standard", () => {
  for (const id of [null, undefined, "", "huge", "150%", 150, "LARGEST"]) {
    assert.strictEqual(resolveTextScale(id).id, DEFAULT_TEXT_SCALE_ID);
    assert.strictEqual(resolveTextScale(id).percent, 100);
  }
});

test("every preset id resolves to its own percent", () => {
  for (const preset of TEXT_SCALE_PRESETS) {
    assert.strictEqual(isTextScaleId(preset.id), true);
    assert.strictEqual(resolveTextScale(preset.id).percent, preset.percent);
  }
  assert.strictEqual(isTextScaleId("largest"), true);
  assert.strictEqual(isTextScaleId("huge"), false);
});

test("percentages format as CSS font sizes", () => {
  assert.strictEqual(textScaleFontSize(100), "100%");
  assert.strictEqual(textScaleFontSize(112.5), "112.5%");
  assert.strictEqual(textScaleFontSize(150), "150%");
  assert.strictEqual(textScaleFontSize("125"), "125%");
  assert.strictEqual(textScaleFontSize(0), "100%");
  assert.strictEqual(textScaleFontSize(-10), "100%");
  assert.strictEqual(textScaleFontSize("abc"), "100%");
});

test("trigger label mirrors the formatted percentage", () => {
  for (const preset of TEXT_SCALE_PRESETS) {
    assert.strictEqual(
      textScaleTriggerLabel(preset.percent),
      textScaleFontSize(preset.percent),
    );
  }
});

test("storage key is namespaced", () => {
  assert.strictEqual(TEXT_SCALE_STORAGE_KEY, "gems:textScale");
});

test("applying a preset writes the root font size", () => {
  const root = fakeRoot();

  applyTextScaleTo(root, "largest");
  assert.strictEqual(root.style.fontSize, "150%");

  applyTextScaleTo(root, "larger");
  assert.strictEqual(root.style.fontSize, "125%");

  applyTextScaleTo(root, "large");
  assert.strictEqual(root.style.fontSize, "112.5%");

  applyTextScaleTo(root, "standard");
  assert.strictEqual(root.style.fontSize, "100%");
});

test("applying an unknown preset falls back to 100%", () => {
  const root = fakeRoot();
  applyTextScaleTo(root, "gigantic");
  assert.strictEqual(root.style.fontSize, "100%");
});

test("applying returns the previous value so it can be restored", () => {
  const root = fakeRoot();

  const first = applyTextScaleTo(root, "largest");
  assert.strictEqual(first, "", "nothing was set before");

  const second = applyTextScaleTo(root, "standard");
  assert.strictEqual(second, "150%", "returns the value it replaced");

  /* Restoring what the hook's cleanup puts back on unmount. */
  root.style.fontSize = second;
  assert.strictEqual(root.style.fontSize, "150%");
});

test("a missing root is a no-op rather than a crash", () => {
  assert.strictEqual(applyTextScaleTo(null, "largest"), "");
  assert.strictEqual(applyTextScaleTo(undefined, "largest"), "");
  assert.strictEqual(applyTextScaleTo({}, "largest"), "");
});

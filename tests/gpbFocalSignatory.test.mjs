import { test } from "node:test";
import assert from "node:assert";

// The GPB / GAD-AR "Prepared By" signatory must be the GAD Focal Person seat,
// even when the MARSU Santa Cruz `Focal Person, Human Resource Services &
// Records Keeping` seat is also filled. The officials API sorts
// `MARSU SANTA CRUZ...` before `OFFICE OF THE PRESIDENT`, so a loose
// `position.includes("focal")` match picks the wrong person. No DB required.
import { findGadFocalOfficial } from "../lib/universityOfficialsMerge.js";

const santaCruzFocal = {
  header: "MARSU SANTA CRUZ BRANCH",
  title: "Focal Person",
  unit: "Human Resource Services & Records Keeping",
  position: "Focal Person, Human Resource Services & Records Keeping",
  name: "wrong-person",
};

const gadFocal = {
  header: "OFFICE OF THE PRESIDENT",
  title: "GAD Focal Person",
  unit: "",
  position: "GAD Focal Person",
  name: "correct-person",
};

test("GAD focal wins even when the Santa Cruz HR focal sorts first", () => {
  // API order: header ASC, so Santa Cruz comes first.
  assert.strictEqual(
    findGadFocalOfficial([santaCruzFocal, gadFocal])?.name,
    "correct-person",
  );
  assert.strictEqual(
    findGadFocalOfficial([gadFocal, santaCruzFocal])?.name,
    "correct-person",
  );
});

test("falls back to exact position, then gad+focal, then legacy focal", () => {
  const legacyDoc = {
    title: "",
    position: "GAD Focal Person",
    name: "legacy-doc",
  };
  assert.strictEqual(findGadFocalOfficial([santaCruzFocal, legacyDoc])?.name, "legacy-doc");

  const gadVariant = {
    title: "gad focal person",
    position: "something else",
    name: "case-insensitive",
  };
  assert.strictEqual(findGadFocalOfficial([gadVariant])?.name, "case-insensitive");

  assert.strictEqual(findGadFocalOfficial([santaCruzFocal])?.name, "wrong-person");
  assert.strictEqual(findGadFocalOfficial([]), null);
  assert.strictEqual(findGadFocalOfficial(undefined), null);
});

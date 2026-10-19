import "dotenv/config";
import mongoose from "mongoose";

/*
 * Read-only census: is the vault a superset of the plaintext block?
 *
 * The strip deletes gemsprofiles.personal / gadData / contact. Anything those
 * blocks hold that the vault does NOT hold is data the strip would destroy
 * rather than relocate - and unlike a code change, an $unset is not undoable
 * with git revert.
 *
 * Runs as a FILE, never as `node -e`. Inline JS is mangled by the PowerShell
 * wrapper (quote characters are eaten before Node parses them), which makes
 * $exists filters match nothing and report false zeroes. A false "0 populated"
 * on a strip decision reads as "nothing to lose" and is the dangerous
 * direction to be wrong in.
 *
 * Reports counts only; never prints a name, email or phone number.
 */

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("[census] MONGODB_URI missing");
  process.exit(1);
}

/* Optional `--db <name>`: read a clone instead of the live database. Needed to
   audit a pre-strip copy once production has already been stripped, which is
   the only way to back-fill a field the census was not yet checking. */
const DB_NAME = (() => {
  const i = process.argv.indexOf("--db");
  return i !== -1 ? process.argv[i + 1] : null;
})();

function withDatabase(uri, name) {
  const schemeEnd = uri.indexOf("://");
  const pathStart = uri.indexOf("/", schemeEnd + 3);
  if (pathStart === -1) throw new Error("MONGODB_URI has no database path");
  const queryStart = uri.indexOf("?", pathStart);
  const tail = queryStart === -1 ? "" : uri.slice(queryStart);
  return `${uri.slice(0, pathStart + 1)}${name}${tail}`;
}

/* Every dotted path the three doomed blocks define. `personal.currentStatus`
   is excluded deliberately: it was relocated to affiliation.person_type and
   is verified separately by verify-person-type.mjs. */
/* Derived from the vault's own PII_FIELDS via the block each key lives in, so
   this list cannot drift behind a field added to the vault contract. A field
   the vault owns but this census omits is a field the strip could delete with
   no counterpart check - the one mistake this script exists to prevent. */
const PRIMITIVES = [
  ...["first_name", "middle_name", "last_name", "birthday", "civil_status",
      "religion", "religion_other", "nationality", "bloodType"].map(
    (k) => [`personal.${k}`, k],
  ),
  ...["sexAtBirth", "gender_preference", "isPWD", "isIndigenousPerson",
      "pwd_type", "socioEconomicStatus", "headOfHousehold"].map(
    (k) => [`gadData.${k}`, k],
  ),
  ...["email", "mobileNumber", "permanentAddress", "currentAddress"].map(
    (k) => [`contact.${k}`, k],
  ),
];

const PLAINTEXT_FIELDS = PRIMITIVES.map(([path]) => path);
const VAULT_COUNTERPART = Object.fromEntries(PRIMITIVES);

/*
 * A boolean false is a real value, not an absence. isPWD=false must not be
 * counted as "not populated" or the census would claim those rows are safe to
 * delete when they carry information the reports depend on.
 */
function populatedFilter(path) {
  return { [path]: { $nin: [null, "", undefined] } };
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = DB_NAME
    ? mongoose.connection.client.db(DB_NAME)
    : mongoose.connection.db;
  const profiles = db.collection("gemsprofiles");
  const vault = db.collection("identityvaults");

  const total = await profiles.countDocuments();
  const vaultTotal = await vault.countDocuments();

  console.log("[census] cluster        : " + (/@([^/?]+)/.exec(MONGODB_URI)?.[1] || "?"));
  console.log("[census] database       : " + db.databaseName);
  console.log("[census] gemsprofiles   : " + total);
  console.log("[census] identityvaults : " + vaultTotal);
  console.log("");

  /* Coverage: how many vault rows actually store each key at all. A key absent
     from every row means the strip has nowhere to read it from afterwards. */
  const vaultCoverage = new Map();
  const perField = await vault
    .aggregate([
      { $project: { ks: { $objectToArray: "$fields" } } },
      { $unwind: "$ks" },
      { $group: { _id: "$ks.k", n: { $sum: 1 } } },
    ])
    .toArray();
  for (const row of perField) vaultCoverage.set(row._id, row.n);

  console.log("[census] plaintext field  |  rows populated  |  vault counterpart  |  vault rows");
  console.log("-".repeat(88));

  const orphans = [];

  for (const path of PLAINTEXT_FIELDS) {
    const populated = await profiles.countDocuments(populatedFilter(path));
    const key = VAULT_COUNTERPART[path];
    const inVault = vaultCoverage.get(key) || 0;

    /* Orphan = real data in a column about to be deleted, with no vault home. */
    const orphaned = populated > 0 && inVault === 0;
    if (orphaned) orphans.push({ path, key, populated });

    console.log(
      "  " +
        path.padEnd(30) +
        " | " +
        String(populated).padStart(15) +
        " | " +
        String(key).padEnd(18) +
        " | " +
        String(inVault).padStart(10) +
        (orphaned ? "   <-- ORPHAN" : ""),
    );
  }

  console.log("");
  console.log("[census] blocks present on profiles");
  for (const block of ["personal", "gadData", "contact"]) {
    const n = await profiles.countDocuments({ [block]: { $exists: true } });
    console.log("  " + block.padEnd(12) + String(n).padStart(6));
  }

  console.log("");
  const missingRef = await profiles.countDocuments({
    $or: [{ vaultRef: null }, { vaultRef: { $exists: false } }],
  });
  console.log("[census] profiles without vaultRef : " + missingRef);

  console.log("");
  if (orphans.length) {
    console.log("[census] STATUS: ORPHANS FOUND - do NOT strip until these are relocated");
    for (const o of orphans) {
      console.log("  " + o.path + " -> no vault key '" + o.key + "' (" + o.populated + " rows populated)");
    }
    await mongoose.disconnect();
    process.exit(2);
  }

  console.log("[census] STATUS: OK - vault covers every plaintext field that holds data");
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("[census] failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

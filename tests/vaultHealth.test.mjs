import { test } from "node:test";
import assert from "node:assert";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";

/*
 * The vault-health probe.
 *
 * This endpoint exists because the key question cannot be answered from a
 * developer machine: the deployed app reads PII_ENCRYPTION_KEY from its own
 * runtime environment, which may point at the same database with a different
 * key. Comparing fingerprints is how two machines prove they agree without
 * either revealing the key, so the comparison has to be stable and the
 * endpoint must never leak the key itself.
 *
 * The route loads here only as source (it imports mongoose); the fingerprint
 * construction is mirrored and checked against the script that already uses it.
 */

function read(...parts) {
  return readFileSync(new URL(`../${parts.join("/")}`, import.meta.url), "utf8");
}

/* Mirrors keyFingerprint in the route and in scripts/check-vault-key.mjs. */
function keyFingerprint(raw) {
  if (!raw) return null;
  const value = String(raw).trim();
  let buf;
  if (/^[0-9a-fA-F]{64}$/.test(value)) buf = Buffer.from(value, "hex");
  else buf = Buffer.from(value, "base64");
  if (buf.length !== 32) return "INVALID-LENGTH";
  return crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16);
}

const HEX = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const B64 = Buffer.from(HEX, "hex").toString("base64");

test("the same key encodes to the same fingerprint", () => {
  /* Hex and base64 are two spellings of the same 32 bytes; the deployment may
     use either, and the fingerprints still have to match. */
  assert.strictEqual(keyFingerprint(HEX), keyFingerprint(B64));
  assert.strictEqual(keyFingerprint(HEX).length, 16);
});

test("surrounding whitespace does not change the fingerprint", () => {
  /* A key pasted into a dashboard often carries a trailing newline. */
  assert.strictEqual(keyFingerprint(`  ${HEX}\n`), keyFingerprint(HEX));
});

test("a different key gives a different fingerprint", () => {
  const other = "f".repeat(64);
  assert.notStrictEqual(keyFingerprint(HEX), keyFingerprint(other));
});

test("a wrong-length key is reported, not silently hashed", () => {
  /* A truncated paste must fail loudly: hashing it anyway would produce a
     fingerprint that never matches and look like a key mismatch. */
  assert.strictEqual(keyFingerprint("abcdef"), "INVALID-LENGTH");
  assert.strictEqual(keyFingerprint("00".repeat(16)), "INVALID-LENGTH");
});

test("no key gives no fingerprint", () => {
  assert.strictEqual(keyFingerprint(undefined), null);
  assert.strictEqual(keyFingerprint(""), null);
});

test("the route is Admin-only and never returns the key", () => {
  const route = read("app", "api", "admin", "vault-health", "route.js");

  assert.match(
    route,
    /requireRole\(req,\s*\["Admin"\]\)/,
    "a decrypt oracle must not be reachable by every role",
  );
  assert.ok(
    !/PII_ENCRYPTION_KEY\s*(,|\)|;)/.test(route.replace(/keyFingerprint\(process\.env\.PII_ENCRYPTION_KEY\)/g, "")),
    "the key itself must never be placed in the response",
  );
  assert.match(route, /fingerprint:\s*keyFingerprint\(/, "only the digest is returned");
});

test("the route reports whether rows actually decrypt", () => {
  /* A fingerprint match only says the key bytes agree. The decrypt probe is
     what says the running process can read the rows it will serve — and it is
     the check the strip gates on. */
  const route = read("app", "api", "admin", "vault-health", "route.js");

  assert.match(route, /decryptFields\s*\(/, "the probe must actually decrypt");
  assert.match(
    route,
    /canDecrypt\s*=\s*rows\.length > 0 && readable === rows\.length/,
    "every sampled row must decrypt, not just some",
  );
  assert.match(
    route,
    /const ok = configured && !derived && payload\.canDecrypt === true/,
    "the gate must require a real key and readable rows",
  );
});

test("the route and the standalone script agree on the fingerprint", () => {
  /* If these two drift, a machine can "pass" the check it was told to run and
     still disagree with the other. */
  const route = read("app", "api", "admin", "vault-health", "route.js");
  const script = read("scripts", "check-vault-key.mjs");

  const slice = (src) =>
    src.match(/createHash\("sha256"\)[\s\S]{0,80}?slice\(0,\s*16\)/)?.[0] || "";

  assert.ok(slice(route), "the route must build a truncated digest");
  assert.strictEqual(
    slice(route).replace(/\s+/g, ""),
    slice(script).replace(/\s+/g, ""),
    "both must produce the same fingerprint for the same key",
  );
});

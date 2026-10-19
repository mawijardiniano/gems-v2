import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { requireRole } from "@/lib/auth";
import {
  CURRENT_KEY_VERSION,
  isVaultConfigured,
  isVaultKeyDerived,
  decryptFields,
  PII_FIELDS,
} from "@/lib/identityVault";
import { connectDB } from "@/lib/db";
import IdentityVault from "@/models/identityVault";

/*
 * Answers "can THIS deployment read its own vault?" — the question that
 * decides whether stripping plaintext PII is reversible.
 *
 * It has to be answered by the deployed process, not by a script on a
 * developer machine: the app reads PII_ENCRYPTION_KEY from its own runtime
 * environment, which may differ from any local .env while pointing at the
 * same database. A local script proves the local key works; only this proves
 * the key the app will actually use works.
 *
 * Nothing here reveals the key or any identity. It reports booleans, a count,
 * and a truncated digest of the key — enough to compare against another
 * machine, useless to anyone who intercepts it. The decrypt test reads one
 * envelope and reports only whether it succeeded, never the value.
 *
 * Admin-only: a decrypt oracle is worth guarding even when it says little.
 */

/* Same construction as the fingerprint in scripts/check-vault-key.mjs, so the
   two values are directly comparable. */
function keyFingerprint(raw) {
  if (!raw) return null;
  const value = String(raw).trim();
  let buf;
  if (/^[0-9a-fA-F]{64}$/.test(value)) buf = Buffer.from(value, "hex");
  else buf = Buffer.from(value, "base64");
  if (buf.length !== 32) return "INVALID-LENGTH";
  return crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16);
}

export async function GET(req) {
  const { user, error, status } = await requireRole(req, ["Admin"]);
  if (error) return NextResponse.json({ error }, { status });

  const configured = isVaultConfigured();
  const derived = isVaultKeyDerived();

  const payload = {
    configured,
    /* Derived means no real key is set and the app fell back to a digest of
       JWT_SECRET. In production that fallback throws instead, so seeing
       `derived: true` here means the deployment is misconfigured. */
    derived,
    keyVersion: CURRENT_KEY_VERSION,
    fingerprint: keyFingerprint(process.env.PII_ENCRYPTION_KEY),
    previousKeySet: Boolean(process.env.PII_ENCRYPTION_KEY_PREVIOUS),
    nodeEnv: process.env.NODE_ENV || null,
    canDecrypt: null,
    sampled: 0,
  };

  /* The decisive check. A fingerprint match only says the key bytes agree; a
     successful decrypt says the running process can actually read the rows
     it will be asked to serve. */
  try {
    await connectDB();
    const rows = await IdentityVault.find(
      { "fields.first_name.v": { $exists: true } },
      { fields: 1, key_version: 1 },
    )
      .limit(3)
      .lean();

    payload.sampled = rows.length;

    let readable = 0;
    for (const row of rows) {
      try {
        const pii = decryptFields(row.fields, {
          dateFields: PII_FIELDS.dates,
          booleanFields: PII_FIELDS.booleans,
        });
        if (pii && typeof pii.first_name === "string" && pii.first_name) {
          readable += 1;
        }
      } catch {
        /* Counted by omission: a throw means this process cannot read the row. */
      }
    }

    payload.canDecrypt = rows.length > 0 && readable === rows.length;
    payload.decrypted = readable;
  } catch (err) {
    console.error("[vault-health] decrypt probe failed:", err.message);
    payload.canDecrypt = false;
    payload.probeError = err.message;
  }

  /* `ok` is the gate the strip waits on: a real key, and rows that decrypt. */
  const ok = configured && !derived && payload.canDecrypt === true;

  return NextResponse.json(
    { ok, ...payload },
    { status: ok ? 200 : 503 },
  );
}

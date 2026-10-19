import crypto from "crypto";

/*
 * Identity Vault crypto + masking helpers.
 *
 * PII is encrypted with AES-256-GCM using PII_ENCRYPTION_KEY (32 bytes,
 * hex or base64, supplied through the environment). Nothing here ever writes
 * plaintext PII to disk: callers encrypt on the way in and decrypt on the
 * way out, and only the broker layer (lib/profileBroker.js) is allowed to
 * call the decrypt helpers.
 *
 * Key handling:
 *   - PII_ENCRYPTION_KEY           current key
 *   - PII_ENCRYPTION_KEY_VERSION   version tag stored alongside the ciphertext
 *   - PII_ENCRYPTION_KEY_PREVIOUS  previous key, so rotation keeps old rows
 *                                  readable (see decryptValue)
 *   - In development, when no key is configured, a key is derived from
 *     JWT_SECRET so the app still boots; production must set a real key.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit nonce, recommended for GCM
const DEV_KEY_SALT = "gems-identity-vault-dev";

/* Marks a decrypted payload as JSON-encoded structured data (an object or an
   array) rather than a literal string. Values written before this existed
   never start with "@", so they still decrypt to plain strings. */
const STRUCTURED_PREFIX = "@@vault:json@@";

/* Doubles a literal leading "@" in string values. Without this a value the
   caller wrote as text could begin with STRUCTURED_PREFIX and be mistaken for
   JSON on the way out. Text that never starts with "@" is untouched, so the
   encoding is a no-op for every real name, email and phone number. */
function escapeMarker(text) {
  return text.startsWith("@") ? `@${text}` : text;
}

function unescapeMarker(text) {
  return text.startsWith("@@") ? text.slice(1) : text;
}

export const CURRENT_KEY_VERSION = Number(
  process.env.PII_ENCRYPTION_KEY_VERSION || 1,
);

function decodeKey(raw) {
  if (!raw) return null;
  const value = String(raw).trim();
  if (/^[0-9a-fA-F]{64}$/.test(value)) return Buffer.from(value, "hex");
  try {
    const buf = Buffer.from(value, "base64");
    if (buf.length === 32) return buf;
  } catch {
    /* fall through to the error below */
  }
  throw new Error(
    "PII_ENCRYPTION_KEY must be 32 bytes encoded as 64 hex characters or base64",
  );
}

/* Map of keyVersion -> key buffer, built lazily so tests can set env vars
   before the first call. */
let keyCache = null;

function getKeys() {
  if (keyCache) return keyCache;

  const current = decodeKey(process.env.PII_ENCRYPTION_KEY);
  const previous = decodeKey(process.env.PII_ENCRYPTION_KEY_PREVIOUS);

  if (!current) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("PII_ENCRYPTION_KEY is required in production");
    }
    /* Dev-only fallback: deterministic key so a restart can still read rows
       written before PII_ENCRYPTION_KEY was added. Never used in prod. */
    const seed = process.env.JWT_SECRET || DEV_KEY_SALT;
    keyCache = {
      keys: new Map([
        [
          CURRENT_KEY_VERSION,
          crypto.createHash("sha256").update(`${DEV_KEY_SALT}:${seed}`).digest(),
        ],
      ]),
      derived: true,
    };
    return keyCache;
  }

  const keys = new Map([[CURRENT_KEY_VERSION, current]]);
  if (previous) keys.set(CURRENT_KEY_VERSION - 1, previous);

  keyCache = { keys, derived: false };
  return keyCache;
}

/* Test hook: forces the key map to be rebuilt on the next call. */
export function resetKeyCache() {
  keyCache = null;
}

export function isVaultConfigured() {
  return Boolean(process.env.PII_ENCRYPTION_KEY);
}

export function isVaultKeyDerived() {
  return getKeys().derived;
}

/**
 * Encrypts a value into the storable envelope `{ v, iv, tag, c }`.
 * Scalars are stored as their text form; objects and arrays are stored as
 * JSON behind STRUCTURED_PREFIX so they come back as objects, not
 * "[object Object]". null/undefined/"" store as null.
 */
export function encryptValue(plaintext) {
  if (plaintext === null || plaintext === undefined) return null;

  /* Structured PII (the nested address sub-documents) must survive the
     round-trip as an object. `String(value)` would flatten it to the useless
     "[object Object]", so anything non-scalar is serialized as JSON behind
     STRUCTURED_PREFIX and rebuilt by decodePlaintext on the way out. */
  const isStructured =
    typeof plaintext === "object" && !(plaintext instanceof Date);

  const text = isStructured
    ? `${STRUCTURED_PREFIX}${JSON.stringify(plaintext)}`
    : typeof plaintext === "string"
      ? escapeMarker(plaintext)
      : String(plaintext);
  if (text === "") return null;

  const { keys } = getKeys();
  const version = CURRENT_KEY_VERSION;
  const key = keys.get(version);
  if (!key) throw new Error("No PII encryption key available");

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);

  return {
    v: String(version),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    c: encrypted.toString("base64"),
  };
}

/**
 * Decrypts an envelope produced by encryptValue. Returns null when the
 * envelope is missing or its key version is unknown, so a key mistake never
 * crashes a page or leaks partial data.
 *
 * A value written from an object comes back as an object (see
 * STRUCTURED_PREFIX); everything else is a plain string.
 */
export function decryptValue(envelope) {
  if (!envelope || !envelope.c || !envelope.iv || !envelope.tag) return null;

  const { keys } = getKeys();
  const version = Number(envelope.v || CURRENT_KEY_VERSION);
  const key = keys.get(version);
  if (!key) {
    console.error(
      `[identityVault] No key for version ${version}; set PII_ENCRYPTION_KEY_PREVIOUS to read old rows`,
    );
    return null;
  }

  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(envelope.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
    const raw = Buffer.concat([
      decipher.update(Buffer.from(envelope.c, "base64")),
      decipher.final(),
    ]).toString("utf8");
    return decodePlaintext(raw);
  } catch {
    /* A tampered or truncated envelope must read as "no value", never as a
       crash — the callers treat null as "absent". */
    return null;
  }
}

/* Reverses the structured-value encoding done by encryptValue. */
function decodePlaintext(raw) {
  if (!raw.startsWith(STRUCTURED_PREFIX)) return unescapeMarker(raw);
  try {
    return JSON.parse(raw.slice(STRUCTURED_PREFIX.length));
  } catch {
    /* Written by a version that used the marker differently, or corrupted:
       hand back the raw text rather than inventing a shape. */
    return raw;
  }
}

/* Date-typed PII (birthday) needs to survive the string round-trip. */
export function encryptDate(date) {
  if (!date) return null;
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return null;
  return encryptValue(value.toISOString());
}

export function decryptDate(envelope) {
  const raw = decryptValue(envelope);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function encryptBoolean(value) {
  if (value === null || value === undefined) return null;
  return encryptValue(value ? "true" : "false");
}

export function decryptBoolean(envelope) {
  const raw = decryptValue(envelope);
  if (raw === null) return null;
  return raw === "true";
}

/**
 * Encrypts a whole object field-by-field into a `Map`-friendly plain object.
 * Values that are `null`, `undefined` or `""` are skipped entirely so the
 * Vault stores only what actually exists.
 *
 * `dateFields` / `booleanFields` list the keys needing typed handling.
 */
export function encryptFields(
  data,
  { dateFields = [], booleanFields = [] } = {},
) {
  const out = {};
  if (!data) return out;

  const dates = new Set(dateFields);
  const booleans = new Set(booleanFields);

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined || value === "") continue;

    let envelope = null;
    if (dates.has(key)) envelope = encryptDate(value);
    else if (booleans.has(key)) envelope = encryptBoolean(value);
    else envelope = encryptValue(value);

    if (envelope) out[key] = envelope;
  }

  return out;
}

/**
 * Decrypts an object of envelopes back into plain values.
 * `dateFields` / `booleanFields` must match the lists used on write, or the
 * value comes back as its raw string ("true") instead of a boolean.
 */
export function decryptFields(
  encrypted,
  { dateFields = [], booleanFields = [] } = {},
) {
  const out = {};
  if (!encrypted) return out;

  const dates = new Set(dateFields);
  const booleans = new Set(booleanFields);
  const entries =
    encrypted instanceof Map ? encrypted.entries() : Object.entries(encrypted);

  for (const [key, envelope] of entries) {
    if (!envelope) continue;
    if (dates.has(key)) out[key] = decryptDate(envelope);
    else if (booleans.has(key)) out[key] = decryptBoolean(envelope);
    else out[key] = decryptValue(envelope);
  }

  return out;
}

/* ------------------------------------------------------------------ */
/* Masking — safe representations for list screens and QR attendance. */
/* ------------------------------------------------------------------ */

/** `Mark` -> `M***`; keeps the first letter so organizers can tell people apart. */
export function maskNamePart(value) {
  if (!value) return "";
  const text = String(value).trim();
  if (!text) return "";
  return `${text[0].toUpperCase()}***`;
}

/**
 * Masks a whole name. `("Mark", "Dela Cruz")` -> `"M*** D***"`.
 * Only the initials survive, never the full surname.
 */
export function maskFullName(firstName, lastName) {
  const parts = [maskNamePart(firstName), maskNamePart(lastName)].filter(
    Boolean,
  );
  return parts.join(" ").trim() || "Unknown";
}

/** `mark@gmail.com` -> `m***@g***.com` — enough to confirm, not to contact. */
export function maskEmail(value) {
  if (!value) return "";
  const text = String(value).trim();
  const at = text.indexOf("@");
  if (at < 1) return "***";
  const local = text.slice(0, at);
  const domain = text.slice(at + 1);
  const domainHead = domain.split(".")[0] || "";
  const tld = domain.includes(".") ? domain.slice(domain.lastIndexOf(".")) : "";
  return `${local[0]}***@${domainHead[0] || "*"}***${tld}`;
}

/** `09171234567` -> `**4567` — last 4 digits only. */
export function maskPhone(value) {
  if (!value) return "";
  const digits = String(value).replace(/\D/g, "");
  if (digits.length <= 4) return "*".repeat(digits.length);
  return `**${digits.slice(-4)}`;
}

export function calcAge(birthday) {
  if (!birthday) return null;
  const date = birthday instanceof Date ? birthday : new Date(birthday);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) {
    age -= 1;
  }
  return age;
}

/**
 * Turns a birthday into an age bracket (`"20-24"`) so dashboards and GAD
 * reports can group people without ever handling the raw date.
 */
export function ageBracket(birthday) {
  const age = calcAge(birthday);
  if (age === null || age < 0 || age > 120) return "Unknown";

  const brackets = [
    [0, 14, "0-14"],
    [15, 19, "15-19"],
    [20, 24, "20-24"],
    [25, 29, "25-29"],
    [30, 34, "30-34"],
    [35, 39, "35-39"],
    [40, 44, "40-44"],
    [45, 49, "45-49"],
    [50, 54, "50-54"],
    [55, 59, "55-59"],
    [60, 64, "60-64"],
    [65, 200, "65+"],
  ];

  for (const [min, max, label] of brackets) {
    if (age >= min && age <= max) return label;
  }
  return "Unknown";
}

/* ------------------------------------------------------------------ */
/* Links and public IDs                                                */
/* ------------------------------------------------------------------ */

const PUBLIC_ID_PREFIX = process.env.GEMS_ID_PREFIX || "GEMS";

/** Random opaque reference used to link GEMS <-> Vault. Never guessable. */
export function generateVaultRef() {
  return crypto.randomUUID();
}

/**
 * Short, human-friendly public identifier (e.g. `GEMS-A3F9C2`). Random by
 * design: it hides creation order and cannot be enumerated the way a
 * sequential number could.
 */
export function generatePublicId(prefix = PUBLIC_ID_PREFIX) {
  const body = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${body}`;
}

/**
 * Blind index for exact-match search on encrypted names.
 * The same name always maps to the same digest, so "find by name" stays
 * indexable without ever storing the plaintext. Keyed with the PII key so a
 * leaked index cannot be brute-forced without the key as well.
 */
export function blindIndex(value) {
  if (!value) return null;
  const { keys } = getKeys();
  const key = keys.get(CURRENT_KEY_VERSION);
  if (!key) return null;
  const normalized = String(value).trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized) return null;
  return crypto.createHmac("sha256", key).update(normalized).digest("hex");
}

/**
 * Normalizes a free-text search term into blind-index candidates.
 * "Mark Dela Cruz" produces the whole string plus each token, covering the
 * common "search by first name", "search by full name" and "search by
 * surname" cases.
 */
export function blindIndexTokens(value) {
  if (!value) return [];
  const normalized = String(value).trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized) return [];

  const tokens = new Set([normalized]);
  for (const part of normalized.split(" ")) {
    if (part) tokens.add(part);
  }

  return [...tokens].map((token) => blindIndex(token)).filter(Boolean);
}

/* The PII fields the Vault owns. Shared so the writer and reader never drift
   apart, and so any new PII field is a single-line change here. */
export const PII_FIELDS = {
  strings: [
    "first_name",
    "middle_name",
    "last_name",
    "civil_status",
    "religion",
    "religion_other",
    "nationality",
    "bloodType",
    "sexAtBirth",
    "gender_preference",
    "pwd_type",
    "socioEconomicStatus",
    "headOfHousehold",
    "email",
    "mobileNumber",
    "permanentAddress",
    "currentAddress",
  ],
  dates: ["birthday"],
  booleans: ["isPWD", "isIndigenousPerson"],
};

export function isPiiField(key) {
  return (
    PII_FIELDS.strings.includes(key) ||
    PII_FIELDS.dates.includes(key) ||
    PII_FIELDS.booleans.includes(key)
  );
}

/**
 * Flattens a GemsProfile-shaped payload (`personal`, `gadData`, `contact`)
 * into the flat bag the Vault stores, so the same encryption path serves both
 * the API writers and the backfill script. Identifier fields (student_id,
 * college, ...) are intentionally left behind in GEMS.
 */
export function extractPiiFromProfile(profile = {}) {
  const { personal = {}, gadData = {}, contact = {} } = profile || {};
  const out = {};
  for (const [key, value] of Object.entries({
    ...personal,
    ...gadData,
    ...contact,
  })) {
    if (isPiiField(key)) out[key] = value;
  }
  return out;
}

/**
 * Deterministic search digests for a name, stored on the GEMS profile so
 * "search by name" stays indexable while the name itself is encrypted.
 * Covers the whole name plus each part, so first-name and surname searches
 * both hit the index.
 */
export function buildSearchIndex({ first_name, middle_name, last_name } = {}) {
  const full = [first_name, middle_name, last_name].filter(Boolean).join(" ");
  const tokens = new Set([
    ...blindIndexTokens(full),
    ...blindIndexTokens(first_name),
    ...blindIndexTokens(last_name),
  ]);
  return [...tokens].filter(Boolean);
}

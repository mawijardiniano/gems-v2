/**
 * Object storage client.
 *
 * The store is S3-compatible, so every caller still speaks the S3 API. What
 * this module exists to prevent is the same five-line `new S3Client({...})`
 * block being copied into each route: those copies drifted to providers twice
 * already, and a client built without `endpoint` silently talks to AWS instead
 * of the configured store. A missing endpoint is therefore a hard failure here
 * rather than a request that quietly goes somewhere else.
 *
 * `forcePathStyle` is required. Without it the SDK turns the bucket name into a
 * subdomain (`bucket.host/...`), which a path-style-only endpoint answers with
 * 404s that look like missing files.
 *
 * `AWS_*` names are kept deliberately: `tests/auditEnvDocs.test.mjs` asserts
 * they are documented, and `lib/auditRetention.js` reads them. `STORAGE_ENDPOINT`
 * is the one value that has no `AWS_*` equivalent.
 *
 * VALUES ARE SANITISED, NOT TRUSTED. A value pasted into a hosting dashboard
 * keeps whatever it was pasted with, and `.env` parsing hides the difference:
 * `dotenv` and the check script both trim, so a value carrying a trailing
 * newline passes locally and fails in production. The failure is not a
 * helpful one either - a trailing newline in `AWS_ACCESS_KEY_ID` is signed
 * into the `Authorization` header, which Node rejects with
 *
 *   TypeError: Invalid character in header content ["authorization"]
 *
 * before any request is sent. There is no HTTP status, so it does not look
 * like a credentials problem at all. Trimming here means the same value works
 * on both sides; a value that still contains an interior newline is reported
 * by name rather than decoded from a stack trace.
 */
import { S3Client } from "@aws-sdk/client-s3";

let client = null;

/** The variable names this module requires, in the order they are checked. */
export const STORAGE_ENV_KEYS = [
  "STORAGE_ENDPOINT",
  "AWS_REGION",
  "AWS_BUCKET_NAME",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
];

/**
 * The value of `name`, trimmed of surrounding whitespace and wrapping quotes.
 *
 * Hosting dashboards store `"value"` literally while `.env` strips the quotes,
 * so unstripped quotes reach the SDK and end up inside a header or a bucket
 * name. Both are stripped here for the same reason: the two sources must
 * behave identically.
 *
 * @param {string} name
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
export function storageEnv(name, env = process.env) {
  const raw = env[name];
  if (raw == null) return "";
  return String(raw).trim().replace(/^["']|["']$/g, "").trim();
}

/**
 * Describes why the storage configuration is unusable, or null when it is fine.
 *
 * Credentials are not checked for validity here - that needs a request - but
 * they are checked for shape. An access key id containing a newline can never
 * be used, and saying so by name is the difference between a two-minute fix
 * and an afternoon spent reading a `TypeError` that never mentions storage.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string|null}
 */
export function storageConfigProblem(env = process.env) {
  for (const name of STORAGE_ENV_KEYS) {
    const value = storageEnv(name, env);
    if (!value) return `${name} is not set`;
    /* Interior control characters survive trimming and cannot be signed into
       a header. Naming the variable is the whole point of this check. */
    if (/[\r\n\t]/.test(value)) {
      return `${name} contains a line break or tab; paste the value again as a single line`;
    }
  }

  const endpoint = storageEnv("STORAGE_ENDPOINT", env);
  if (!/^https?:\/\//i.test(endpoint)) {
    return "STORAGE_ENDPOINT must start with https:// (copy it verbatim from the S3 connection panel)";
  }

  return null;
}

/** The bucket holding application files. */
export function storageBucket(env = process.env) {
  return storageEnv("AWS_BUCKET_NAME", env);
}

/**
 * The shared client. Built once per process; `S3Client` pools connections, so
 * rebuilding it per request would throw that away.
 */
export function getS3Client() {
  if (client) return client;

  const problem = storageConfigProblem();
  if (problem) {
    throw new Error(`[storage] ${problem}. Refusing to issue a request.`);
  }

  client = new S3Client({
    forcePathStyle: true,
    region: storageEnv("AWS_REGION"),
    endpoint: storageEnv("STORAGE_ENDPOINT"),
    credentials: {
      accessKeyId: storageEnv("AWS_ACCESS_KEY_ID"),
      secretAccessKey: storageEnv("AWS_SECRET_ACCESS_KEY"),
    },
  });

  return client;
}

/**
 * Where to read an object from in the browser.
 *
 * The bucket is private, so there is no URL that serves it without a session.
 * Everything therefore goes through `/api/files/proxy`, which checks the
 * session before reading. Callers must not link straight to storage: an
 * object URL would either 404 or, on a bucket that someone later made public,
 * hand the document to whoever holds the link.
 */
export function objectProxyUrl(key) {
  return key ? `/api/files/proxy?key=${encodeURIComponent(key)}` : "";
}

/**
 * The URL stored alongside a key in Mongo.
 *
 * Deliberately returns the same session-checked path the viewer uses rather
 * than a storage URL. The key is the durable identifier - reads resolve
 * through it - and storing a provider URL is what froze the previous
 * provider's hostname into every document.
 */
export function buildObjectUrl(key) {
  return objectProxyUrl(key);
}

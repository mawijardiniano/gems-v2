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
 */
import { S3Client } from "@aws-sdk/client-s3";

let client = null;

/**
 * Describes why the storage configuration is unusable, or null when it is fine.
 *
 * Credentials are not checked here: a client built without them still resolves
 * them from the SDK's own provider chain, and refusing early would turn a
 * working credential setup into a boot failure. What is checked is the wiring
 * that no provider chain can supply — where the store is and which bucket.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string|null}
 */
export function storageConfigProblem(env = process.env) {
  if (!env.STORAGE_ENDPOINT) {
    return "STORAGE_ENDPOINT is not set; cannot tell which object store to use";
  }
  if (!env.AWS_BUCKET_NAME) return "AWS_BUCKET_NAME is not set";
  return null;
}

/** The bucket holding application files. */
export function storageBucket(env = process.env) {
  return env.AWS_BUCKET_NAME;
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
    region: process.env.AWS_REGION,
    endpoint: process.env.STORAGE_ENDPOINT,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
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
 * than a storage URL. The key is the durable identifier — reads resolve
 * through it — and storing a provider URL is what froze the previous provider's
 * hostname into every document.
 */
export function buildObjectUrl(key) {
  return objectProxyUrl(key);
}

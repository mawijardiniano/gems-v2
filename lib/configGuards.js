/**
 * Startup-time configuration guards.
 *
 * A weak `JWT_SECRET` is not a theoretical problem: the secret signs the
 * session cookie, so anyone who guesses it can mint a token with
 * `role: "Admin"` and read every vaulted identity through the profile APIs.
 * The check below turns that silent misconfiguration into a loud boot failure
 * in production, where it actually matters.
 *
 * Mirrors the production-strictness of `lib/identityVault.js`, which throws
 * when `PII_ENCRYPTION_KEY` is missing outside development.
 */

/* Values that show up in tutorials, .env.example files and pasted snippets.
   None of these are secrets. */
const PLACEHOLDER_SECRETS = new Set([
  "secret",
  "supersecret",
  "supersecretkey",
  "supersecretkey123",
  "jwtsecret",
  "jwt_secret",
  "changeme",
  "change-me",
  "password",
  "your-secret-key",
  "test",
  "test-secret",
  "dev",
  "development",
]);

/* A real secret should be long and not composed of one repeated character. */
const MIN_SECRET_LENGTH = 32;

/**
 * Describes why `secret` is unfit for production, or `null` when it is fine.
 * @param {string|undefined} secret
 * @returns {string|null}
 */
export function jwtSecretProblem(secret) {
  const value = typeof secret === "string" ? secret.trim() : "";
  if (!value) return "JWT_SECRET is not set";
  if (value.length < MIN_SECRET_LENGTH) {
    return `JWT_SECRET is only ${value.length} characters; use at least ${MIN_SECRET_LENGTH}`;
  }
  if (PLACEHOLDER_SECRETS.has(value.toLowerCase())) {
    return "JWT_SECRET is a well-known placeholder value";
  }
  /* Distinct-character count catches "aaaa...", "0000...", "abcabcabc...". */
  if (new Set(value).size < 8) {
    return "JWT_SECRET has too few distinct characters to be random";
  }
  return null;
}

/**
 * Throws when the process is running in production with an unusable
 * `JWT_SECRET`. Development keeps working unchanged so local setups are not
 * broken by a missing secret.
 *
 * @param {{ env?: NodeJS.ProcessEnv, fatal?: boolean }} [options]
 *   `fatal: false` downgrades the failure to a warning on stderr.
 * @returns {string|null} The problem description, or null when the secret is acceptable.
 */
export function assertJwtSecret({ env = process.env, fatal } = {}) {
  const problem = jwtSecretProblem(env.JWT_SECRET);
  if (!problem) return null;

  const isProduction = env.NODE_ENV === "production";
  const shouldThrow = fatal ?? isProduction;

  if (shouldThrow) {
    throw new Error(
      `${problem}. Refusing to start. Generate one with:\n` +
        `  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`,
    );
  }

  console.warn(
    `[config] ${problem}. This is tolerated outside production but must be fixed before deploying.`,
  );
  return problem;
}

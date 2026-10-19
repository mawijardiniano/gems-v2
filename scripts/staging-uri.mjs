import "dotenv/config";

/*
 * Prints the MONGODB_URI pointed at another database on the same cluster.
 *
 * This exists as a file rather than as `node -e` because the shell wrapper
 * mangles `$` sequences and regex escapes inside inline JS, silently producing
 * an empty or wrong connection string. Getting this wrong in the strip runs
 * the strip against the wrong database, so it is worth a file.
 *
 * The credentials are never printed in full: the URI is emitted in a form that
 * can be captured into an environment variable by the caller, but this script
 * only ever echoes the host and target database name.
 *
 * Usage:
 *   node scripts/staging-uri.mjs gems_staging_strip
 */

const target = process.argv[2];
if (!target) {
  console.error("[staging-uri] usage: node scripts/staging-uri.mjs <db-name>");
  process.exit(1);
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("[staging-uri] MONGODB_URI missing");
  process.exit(1);
}

/*
 * Replace the path component. A MongoDB URI looks like
 *   mongodb+srv://user:pass@host/dbname?opts
 * so the database is everything between the first "/" after the host and the
 * "?" that begins the options. Splitting on those two anchors avoids a regex
 * full of escapes, which is the part that kept getting mangled.
 */
const schemeEnd = uri.indexOf("://");
const hostStart = schemeEnd + 3;
const pathStart = uri.indexOf("/", hostStart);
if (pathStart === -1) {
  console.error("[staging-uri] URI has no database path");
  process.exit(1);
}
const queryStart = uri.indexOf("?", pathStart);
const head = uri.slice(0, pathStart + 1);
const tail = queryStart === -1 ? "" : uri.slice(queryStart);
const rebuilt = `${head}${target}${tail}`;

const host = /@([^/?]+)/.exec(uri)?.[1] || "?";
console.error(`[staging-uri] host   : ${host}`);
console.error(`[staging-uri] target : ${target}`);

/* stdout only, so the caller can capture it without the log lines. */
process.stdout.write(rebuilt);

import { copyFileSync, existsSync, statSync } from "fs";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

/**
 * Copies the pdf.js worker from node_modules into /public after every
 * install, so the served worker version always matches the installed
 * pdfjs-dist API version (a mismatch makes pdf.js refuse to render).
 * Runs automatically via the "postinstall" npm lifecycle hook.
 */
try {
  const require = createRequire(import.meta.url);
  const pkgRoot = dirname(require.resolve("pdfjs-dist/package.json"));
  const src = join(pkgRoot, "build", "pdf.worker.min.mjs");
  const dest = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "pdf.worker.min.mjs");

  if (!existsSync(src)) {
    console.warn("[copy-pdf-worker] worker not found at", src, "- skipping");
  } else {
    copyFileSync(src, dest);
    console.log(
      `[copy-pdf-worker] copied pdf.worker.min.mjs (${statSync(dest).size} bytes) to public/`,
    );
  }
} catch (err) {
  console.warn("[copy-pdf-worker] pdfjs-dist not installed - skipping:", err?.message);
}


const fs = require("node:fs");
const path = require("node:path");

const targets = process.argv.slice(2);

(async () => {
  const swc = require("next/dist/build/swc");
  try {
    await swc.loadBindings();
  } catch (err) {
    /* Already loaded is fine. */
  }
  const transform = swc.transform;
  let failed = false;

  for (const target of targets) {
    const filename = path.resolve(target);
    const code = fs.readFileSync(filename, "utf8");
    try {
      await transform(code, {
        filename,
        jsc: {
          parser: { syntax: "ecmascript", jsx: true },
          transform: { react: { runtime: "automatic" } },
        },
      });
      console.log(`OK    ${target}`);
    } catch (err) {
      failed = true;
      console.log(`FAIL  ${target}\n${err.message}`);
    }
  }
  process.exit(failed ? 1 : 0);
})();
import { copyFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";

// Standalone tracing omits most legal notices. Preserve the installed dependency
// notices, including Next.js's bundled packages, alongside the production server.
// Walk real directories only: pnpm's package store is inside node_modules, and
// following its dependency symlinks would create cycles and duplicate copies.
const standalone = path.resolve(".next/standalone");
const modules = path.resolve("node_modules");
const destination = path.join(standalone, "licenses", "dependencies");
const noticeName = /^(?:licen[cs]e|notice|copying|copyright)(?:[._-].*)?$/i;
let notices = 0;

async function copyNotices(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const source = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await copyNotices(source);
    } else if (entry.isFile() && noticeName.test(entry.name)) {
      const target = path.join(destination, path.relative(modules, source));
      await mkdir(path.dirname(target), { recursive: true });
      await copyFile(source, target);
      notices++;
    }
  }
}

// Fail if next build did not create its expected standalone artifact.
await readdir(standalone);
await copyNotices(modules);
if (notices === 0) throw new Error("No dependency license notices found; refusing to package without notices.");
for (const file of ["LICENSE", "THIRD_PARTY_NOTICES.md"]) {
  await copyFile(path.resolve(file), path.join(standalone, file));
}
console.log(`Packaged ${notices} dependency notices and the project license with the standalone server.`);

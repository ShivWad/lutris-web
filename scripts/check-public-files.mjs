import { execFileSync } from "node:child_process";

let trackedFiles;

try {
  trackedFiles = execFileSync("git", ["ls-files", "-z"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  })
    .split("\0")
    .filter(Boolean);
} catch {
  console.error("Public-tree check requires a Git checkout.");
  process.exit(2);
}

if (trackedFiles.length === 0) {
  console.error("Public-tree check requires files in Git's index. Stage the intended source files before running it.");
  process.exit(2);
}

const unsafePatterns = [
  { pattern: /^data\/(?!\.gitkeep$)/, reason: "local library data" },
  { pattern: /^imports\/(?!\.gitkeep$)/, reason: "local library export" },
  { pattern: /(^|\/)\.env(?:\.|$)/, reason: "environment file" },
  { pattern: /(^|\/)[^/]+\.(?:db|sqlite)(?:-.+)?$/i, reason: "database" },
  { pattern: /(^|\/)[^/]+\.log$/i, reason: "log file" },
  { pattern: /^(?:\.agents|\.codex|\.opencode)\//, reason: "local agent state" },
  { pattern: /^\.aws\//, reason: "cloud credentials or account configuration" },
  { pattern: /^\.impeccable\/hook\.cache\.json$/, reason: "local design-check cache" },
];

const allowedFiles = new Set([".env.example"]);
const unsafeFiles = trackedFiles.flatMap((file) => {
  if (allowedFiles.has(file)) return [];

  const match = unsafePatterns.find(({ pattern }) => pattern.test(file));
  return match ? [{ file, reason: match.reason }] : [];
});

if (unsafeFiles.length > 0) {
  console.error("Refusing public build: sensitive local files are tracked:\n");
  for (const { file, reason } of unsafeFiles) {
    console.error(`- ${file} (${reason})`);
  }
  console.error("\nRemove them from Git history before publishing.");
  process.exit(1);
}

console.log("Public-tree check passed.");

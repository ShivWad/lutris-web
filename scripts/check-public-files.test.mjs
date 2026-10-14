import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("./check-public-files.mjs", import.meta.url));
let directory;
const git = (...args) => execFileSync("git", args, { cwd: directory, stdio: "ignore" });
const check = () => spawnSync(process.execPath, [script], { cwd: directory, encoding: "utf8" });

beforeEach(() => {
  directory = mkdtempSync(path.join(tmpdir(), "lutris-public-tree-"));
  git("init", "--quiet");
});

afterEach(() => rmSync(directory, { recursive: true, force: true }));

describe("public-tree release guard", () => {
  it("rejects an empty index instead of reporting a clean public tree", () => {
    const result = check();
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("Stage the intended source files");
  });

  it("permits an initial staged source tree, empty data folders and the example environment", () => {
    mkdirSync(path.join(directory, "data"));
    mkdirSync(path.join(directory, "imports"));
    for (const name of ["README.md", "data/.gitkeep", "imports/.gitkeep", ".env.example"]) {
      writeFileSync(path.join(directory, name), "");
    }
    git("add", ".");
    expect(check().status).toBe(0);
  });

  it("rejects staged exports, databases, environment files and cloud credentials", () => {
    mkdirSync(path.join(directory, "data"));
    mkdirSync(path.join(directory, "imports"));
    mkdirSync(path.join(directory, ".aws"));
    for (const name of ["data/library.sqlite", "imports/library.json", ".env", ".aws/credentials"]) {
      writeFileSync(path.join(directory, name), "synthetic fixture");
    }
    git("add", ".");
    const result = check();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("local library data");
    expect(result.stderr).toContain("local library export");
    expect(result.stderr).toContain("environment file");
    expect(result.stderr).toContain("cloud credentials");
    expect(result.stderr).not.toContain("synthetic fixture");
  });
});

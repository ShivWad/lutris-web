import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { request } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { startHostBridge } from "./host-bridge.mjs";

let directory;
let server;
const call = (socketPath, { method = "POST", url = "/refresh", headers = {}, body } = {}) => new Promise((resolve, reject) => {
  const req = request({ socketPath, method, path: url, headers }, (response) => {
    let output = "";
    response.setEncoding("utf8");
    response.on("data", (chunk) => { output += chunk; });
    response.on("end", () => resolve({ status: response.statusCode, body: JSON.parse(output) }));
  });
  req.on("error", reject);
  req.end(body);
});

async function start(exportLibrary) {
  directory = await mkdtemp(path.join(tmpdir(), "lutris-bridge-test-"));
  const socketPath = path.join(directory, "refresh.sock");
  server = await startHostBridge({ socketPath, exportLibrary });
  return socketPath;
}

afterEach(async () => {
  vi.unstubAllEnvs();
  if (server) await new Promise((resolve) => server.close(resolve));
  server = undefined;
  if (directory) await rm(directory, { recursive: true, force: true });
  directory = undefined;
});

describe("host Lutris helper", () => {
  it("exports through the fixed Lutris listing command without a Python or online-sync dependency", async () => {
    const socketPath = await start();
    const games = [{ id: 1, name: "Cached Epic game", service: "egs" }];
    await writeFile(path.join(directory, "lutris"), `#!/usr/bin/env node
require("node:fs").writeFileSync(__dirname + "/arguments.json", JSON.stringify(process.argv.slice(2)));
process.stdout.write(${JSON.stringify(JSON.stringify(games))});
`, { mode: 0o755 });
    vi.stubEnv("PATH", `${directory}:${process.env.PATH}`);
    expect(await call(socketPath)).toEqual({ status: 200, body: games });
    expect(JSON.parse(await readFile(path.join(directory, "arguments.json"), "utf8"))).toEqual(["--list-all-service-games", "--json"]);
  });

  it("exports fresh games on every request with owner/group-only socket access", async () => {
    let games = [{ id: 1, name: "First", service: "steam" }];
    const socketPath = await start(async () => JSON.stringify(games));
    expect((await stat(socketPath)).mode & 0o777).toBe(0o660);
    expect(await call(socketPath)).toEqual({ status: 200, body: games });
    games = [...games, { id: 2, name: "New game", service: "gog" }];
    expect(await call(socketPath)).toEqual({ status: 200, body: games });
  });

  it("rejects browser requests, arbitrary operations and supplied command data", async () => {
    let exports = 0;
    const socketPath = await start(async () => { exports++; return "[]"; });
    for (const input of [
      { method: "GET" },
      { url: "/refresh?command=whoami" },
      { url: "/anything" },
      { headers: { Origin: "https://untrusted.example" } },
      { headers: { "Sec-Fetch-Site": "same-origin" } },
      { headers: { "Content-Length": "2" }, body: "{}" },
    ]) {
      expect((await call(socketPath, input)).status).toBeGreaterThanOrEqual(400);
    }
    expect(exports).toBe(0);
  });

  it("rejects overlapping exports and unlocks after an export failure", async () => {
    let release;
    const socketPath = await start(() => new Promise((resolve, reject) => { release = () => reject(new Error("Export unavailable")); }));
    const pending = call(socketPath);
    await vi.waitFor(() => expect(release).toBeTypeOf("function"));
    expect((await call(socketPath)).status).toBe(409);
    release();
    expect((await pending).status).toBe(503);
    release = undefined;
    const next = call(socketPath);
    await vi.waitFor(() => expect(release).toBeTypeOf("function"));
    release();
    expect((await next).status).toBe(503);
  });

  it("rejects invalid exports but permits an explicitly empty library", async () => {
    let output = "not json";
    const socketPath = await start(async () => output);
    for (const invalid of ["not json", "{}", "null", "[null]"]) {
      output = invalid;
      expect((await call(socketPath)).status).toBe(503);
    }
    output = "[]";
    expect(await call(socketPath)).toEqual({ status: 200, body: [] });
  });

  it("does not replace an active helper or a regular file", async () => {
    const socketPath = await start(async () => "[]");
    await expect(startHostBridge({ socketPath })).rejects.toThrow("already listening");
    expect((await call(socketPath)).status).toBe(200);
    const regularFile = path.join(directory, "file");
    await writeFile(regularFile, "keep me");
    await expect(startHostBridge({ socketPath: regularFile })).rejects.toThrow("non-socket");
    expect(await readFile(regularFile, "utf8")).toBe("keep me");
  });
});

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { startHostBridge } from "./host-bridge.mjs";

for (const file of ["LICENSE", "THIRD_PARTY_NOTICES.md"]) {
  assert.equal(await readFile(path.join(".next/standalone", file), "utf8"), await readFile(file, "utf8"));
}
for (const [name, file] of [["next", "license.md"], ["react", "LICENSE"], ["react-dom", "LICENSE"], ["lucide-react", "LICENSE"]]) {
  const source = path.join(await realpath(path.join("node_modules", name)), file);
  const packaged = path.join(".next/standalone/licenses/dependencies", path.relative(path.resolve("node_modules"), source));
  assert.equal(await readFile(packaged, "utf8"), await readFile(source, "utf8"), `${name} license must be preserved`);
}

const directory = await mkdtemp(path.join(tmpdir(), "lutris-smoke-"));
const source = path.join(directory, "library.json");
const reservation = createServer();
reservation.listen(0, "127.0.0.1");
await once(reservation, "listening");
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const games = Array.from({ length: 25 }, (_, id) => ({ id, name: `Test Game ${String(id).padStart(2, "0")}`, service: "steam" }));
await writeFile(source, JSON.stringify(games));
const hostMode = process.argv.includes("--host");
const hostSocket = path.join(directory, "host.sock");
const bridge = hostMode ? await startHostBridge({ socketPath: hostSocket, exportLibrary: () => readFile(source, "utf8") }) : null;
let output = "";
const server = spawn(process.execPath, [".next/standalone/server.js"], {
  env: { ...process.env, HOSTNAME: "127.0.0.1", PORT: String(port), LUTRIS_DEMO: "0", LUTRIS_IMPORT_FILE: source, LUTRIS_HOST_SOCKET: hostMode ? hostSocket : "", LUTRIS_DATA_DIR: directory, LUTRIS_DATABASE_PATH: path.join(directory, "library.sqlite"), NEXT_TELEMETRY_DISABLED: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.on("data", (chunk) => { output = (output + chunk).slice(-16000); });
server.stderr.on("data", (chunk) => { output = (output + chunk).slice(-16000); });
const exited = once(server, "exit");
const request = (pathname, options) => fetch(`${origin}${pathname}`, { ...options, signal: AbortSignal.timeout(5000) });
const json = async (pathname) => {
  const response = await request(pathname);
  assert.equal(response.status, 200, pathname);
  return response.json();
};

try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error("Production server exited before startup.");
    try {
      ready = (await request("/api/library")).ok;
    } catch { /* Wait for the listening socket. */ }
    if (ready) break;
    await delay(100);
  }
  assert.ok(ready, "Production server did not become ready.");
  assert.equal((await json("/api/library")).total, 0);
  for (const endpoint of ["refresh", "rebuild"]) {
    assert.equal((await request(`/api/library/${endpoint}`, { method: "POST", headers: { Origin: "https://untrusted.example" } })).status, 403);
  }
  assert.equal((await request("/api/library/refresh", { method: "POST", headers: { Origin: origin } })).status, 200);
  const first = await json("/api/library?pageSize=12");
  const second = await json("/api/library?pageSize=12&page=2");
  assert.equal(first.total, 25);
  assert.equal(first.groups.length, 12);
  assert.equal(first.runtimeMode, hostMode ? "local" : "import");
  assert.ok(!second.groups.some((group) => first.groups.some((item) => item.key === group.key)));
  assert.equal((await json("/api/library?query=Game%2001")).total, 1);
  assert.equal((await json("/api/stats")).stats.total, 25);
  for (const route of ["/", "/backlog", "/stats", "/sale-check?q=Test&q=Other"]) {
    assert.equal((await request(route)).status, 200, route);
  }
  await writeFile(source, JSON.stringify([...games, { id: 26, name: "Newly acquired game", service: "ubisoft" }]));
  assert.equal((await request("/api/library/refresh", { method: "POST", headers: { Origin: origin } })).status, 200);
  assert.equal((await json("/api/library?query=Newly%20acquired")).total, 1);
  const ubisoft = await json("/api/library?service=ubisoft");
  assert.equal(ubisoft.total, 1);
  assert.equal(ubisoft.counts.ubisoft, 1);
  assert.equal(ubisoft.groups[0].games[0].service, "ubisoft");
  assert.equal((await json("/api/stats")).stats.byService.ubisoft, 1);
  await writeFile(source, "{}");
  for (const endpoint of ["refresh", "rebuild"]) {
    assert.equal((await request(`/api/library/${endpoint}`, { method: "POST" })).status, 503);
    assert.equal((await json("/api/library")).total, 26);
  }
  await writeFile(source, "[]");
  assert.equal((await request("/api/library/rebuild", { method: "POST" })).status, 200);
  assert.equal((await json("/api/library")).total, 0);
  console.log(`Production smoke test passed (${hostMode ? "host helper" : "file import"}): routes, fresh acquisitions, pagination, search, statistics, request guards, and rebuild.`);
} catch (error) {
  console.error(output);
  throw error;
} finally {
  server.kill("SIGTERM");
  const forceStop = setTimeout(() => server.kill("SIGKILL"), 5000);
  await exited;
  clearTimeout(forceStop);
  if (bridge) await new Promise((resolve) => bridge.close(resolve));
  await rm(directory, { recursive: true, force: true });
}

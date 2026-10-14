import { execFile } from "node:child_process";
import { chmod, lstat, mkdir, unlink } from "node:fs/promises";
import { createServer } from "node:http";
import { connect } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const runFile = promisify(execFile);
export const defaultSocketPath = fileURLToPath(new URL("../data/host-bridge/refresh.sock", import.meta.url));

async function exportLutris() {
  try {
    const { stdout } = await runFile("lutris", ["--list-all-service-games", "--json"], {
      timeout: 60_000,
      maxBuffer: 32 * 1024 * 1024,
    });
    return stdout;
  } catch (error) {
    if (error.code === "ENOENT") throw new Error("Lutris is not installed or available in the host helper's PATH.");
    if (error.killed) throw new Error("The host Lutris export timed out. The existing library was kept.");
    // Do not expose provider logs or account metadata in the browser.
    throw new Error("The host Lutris export failed. Check Lutris on the host. The existing library was kept.");
  }
}

function validateExport(output) {
  const parsed = JSON.parse(output);
  const games = Array.isArray(parsed) ? parsed : parsed?.games;
  if (!Array.isArray(games) || games.some((game) => !game || typeof game !== "object" || Array.isArray(game))) {
    throw new Error("Invalid game records");
  }
}

async function removeStaleSocket(socketPath) {
  let entry;
  try {
    entry = await lstat(socketPath);
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  if (!entry.isSocket()) throw new Error(`Refusing to replace a non-socket file at ${socketPath}.`);
  const active = await new Promise((resolve, reject) => {
    const probe = connect(socketPath);
    probe.once("connect", () => { probe.destroy(); resolve(true); });
    probe.once("error", (error) => {
      if (error.code === "ECONNREFUSED" || error.code === "ENOENT") resolve(false);
      else reject(error);
    });
  });
  if (active) throw new Error("A host Lutris helper is already listening on this socket.");
  await unlink(socketPath).catch((error) => { if (error.code !== "ENOENT") throw error; });
}

// The exporter can be replaced by fixtures in tests; requests never supply commands or paths.
export async function startHostBridge({ socketPath = defaultSocketPath, exportLibrary = exportLutris } = {}) {
  await mkdir(path.dirname(socketPath), { recursive: true, mode: 0o750 });
  await removeStaleSocket(socketPath);
  let running = false;
  const server = createServer(async (request, response) => {
    const send = (status, body) => {
      response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      response.end(body);
    };
    // Only the server connects over the mounted Unix socket. Reject browser-originated requests.
    if (request.headers.origin || request.headers["sec-fetch-site"]) {
      send(403, JSON.stringify({ error: "Browser requests are not allowed." }));
      return;
    }
    if (request.method !== "POST" || request.url !== "/refresh") {
      send(404, JSON.stringify({ error: "Unknown helper operation." }));
      return;
    }
    if (request.headers["transfer-encoding"] || Number(request.headers["content-length"] ?? 0) !== 0) {
      send(400, JSON.stringify({ error: "Refresh does not accept request data." }));
      return;
    }
    if (running) {
      send(409, JSON.stringify({ error: "A host Lutris export is already running. Try again when it finishes." }));
      return;
    }
    running = true;
    try {
      const output = await exportLibrary();
      try {
        validateExport(output);
      } catch {
        throw new Error("Lutris returned invalid JSON game records. The existing library was kept.");
      }
      send(200, output);
      console.log("Library refresh completed: fresh host export ready.");
    } catch (error) {
      send(503, JSON.stringify({ error: error instanceof Error ? error.message : "Host Lutris export failed." }));
    } finally {
      running = false;
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(socketPath, resolve);
  });
  await chmod(socketPath, 0o660);
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await startHostBridge();
  console.log(`Lutris host helper listening on ${defaultSocketPath}`);
  for (const signal of ["SIGTERM", "SIGINT"]) {
    process.once(signal, () => server.close(() => process.exit(0)));
  }
}

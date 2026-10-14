import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let directory: string;
let source: string;
let client: typeof import("./client");
let database: typeof import("./database");
const fixture = [{ id: 1, name: "原神", service: "steam" }, { id: 1, name: "明日方舟", service: "steam" }, { id: 3, name: "Pokémon", service: "gog" }];

function closeDatabase() {
  const state = globalThis as typeof globalThis & { __lutrisDatabase?: { close: () => void } };
  state.__lutrisDatabase?.close();
  delete state.__lutrisDatabase;
}

beforeAll(async () => {
  directory = mkdtempSync(path.join(tmpdir(), "lutris-import-test-"));
  source = path.join(directory, "source.json");
  vi.stubEnv("LUTRIS_DEMO", "0");
  vi.stubEnv("LUTRIS_HOST_SOCKET", "");
  vi.stubEnv("LUTRIS_DATA_DIR", directory);
  vi.stubEnv("LUTRIS_DATABASE_PATH", path.join(directory, "library.sqlite"));
  vi.stubEnv("LUTRIS_IMPORT_FILE", source);
  vi.resetModules();
  client = await import("./client");
  database = await import("./database");
});

afterAll(() => {
  closeDatabase();
  vi.unstubAllEnvs();
  rmSync(directory, { recursive: true, force: true });
});

describe("persistent library updates", () => {
  it("keeps distinct non-Latin titles and repeated provider IDs searchable", async () => {
    writeFileSync(source, JSON.stringify(fixture));
    await client.refreshLibrary();
    expect(database.queryLibrary().total).toBe(3);
    expect(database.queryLibrary({ query: "原神" }).total).toBe(1);
    expect(database.queryLibrary({ query: "Pokémon" }).total).toBe(1);
    expect(database.queryLibrary({ query: "pokemon" }).total).toBe(1);
    closeDatabase();
    expect(database.readLibrary().games).toHaveLength(3);
  });

  it("preserves the last successful index on invalid refresh and rebuild", async () => {
    for (const output of ["", "{}", "null", "broken json", "[null]"]) {
      writeFileSync(source, output);
      await expect(client.refreshLibrary()).rejects.toThrow();
      await expect(client.rebuildLibrary()).rejects.toThrow();
      expect(database.readLibrary().games).toHaveLength(3);
    }
  });

  it("keeps the old index if a replacement cannot be serialized", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => database.rebuildDatabase([{ id: 1, name: "Broken", service: "steam", installed: false, rawDetails: circular }], new Date().toISOString())).toThrow();
    expect(database.readLibrary().games).toHaveLength(3);
  });

  it("rolls back a failed refresh transaction", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => database.replaceLibrary([{ id: 1, name: "Broken", service: "steam", installed: false, rawDetails: circular }], new Date().toISOString())).toThrow();
    expect(database.readLibrary().games).toHaveLength(3);
  });

  it("rejects overlapping updates and releases the lock afterward", async () => {
    writeFileSync(source, JSON.stringify(fixture));
    const pending = client.refreshLibrary();
    await expect(client.rebuildLibrary()).rejects.toThrow("already running");
    await pending;
    await expect(client.rebuildLibrary()).resolves.toMatchObject({ source: "lutris" });
  });

  it("rebuilds a corrupt database without changing the source", async () => {
    closeDatabase();
    writeFileSync(path.join(directory, "library.sqlite"), "not a database");
    expect(() => database.readLibrary()).toThrow();
    await client.rebuildLibrary();
    expect(database.readLibrary().games).toHaveLength(3);
    expect(JSON.parse(readFileSync(source, "utf8"))).toEqual(fixture);
  });

  it("allows a valid empty export to intentionally clear the index", async () => {
    writeFileSync(source, "[]");
    await client.refreshLibrary();
    expect(database.readLibrary().games).toEqual([]);
  });

  it("includes newly connected Ubisoft, EA and unknown services in browsing and statistics", async () => {
    writeFileSync(source, JSON.stringify([
      { id: 1, name: "Shared game", service: "steam" },
      { id: 2, name: "Shared game", service: "ubisoft" },
      { id: 3, name: "EA game", service: "ea_app" },
      { id: 4, name: "Another store game", service: "unknown" },
    ]));
    await client.refreshLibrary();
    expect(database.queryLibrary().counts).toMatchObject({ all: 3, steam: 1, ubisoft: 1, ea_app: 1, other: 1 });
    expect(database.queryLibrary({ service: "ubisoft" }).groups[0].name).toBe("Shared game");
    expect(database.queryLibrary({ service: "ea_app" }).groups[0].name).toBe("EA game");
    expect(database.queryLibrary({ service: "other" }).total).toBe(1);
    expect((await client.getLibraryStats()).stats.byService).toMatchObject({ steam: 1, ubisoft: 1, ea_app: 1, other: 1 });
  });

  it("requests fresh host exports instead of the stale import and preserves the index if the helper stops", async () => {
    const socketPath = path.join(directory, "host.sock");
    let output = JSON.stringify(fixture);
    let status = 200;
    let requests = 0;
    const server = createServer((request, response) => {
      expect(request.method).toBe("POST");
      expect(request.url).toBe("/refresh");
      requests++;
      response.writeHead(status, { "Content-Type": "application/json" });
      response.end(output);
    });
    await new Promise<void>((resolve) => server.listen(socketPath, resolve));
    vi.stubEnv("LUTRIS_HOST_SOCKET", socketPath);
    writeFileSync(source, "[]");
    try {
      await client.refreshLibrary();
      expect(database.queryLibrary().runtimeMode).toBe("local");
      expect(database.readLibrary().games).toHaveLength(3);
      output = JSON.stringify([...fixture, { id: 4, name: "New host game", service: "steam" }]);
      await client.refreshLibrary();
      expect(database.queryLibrary({ query: "New host game" }).total).toBe(1);
      expect(database.readLibrary().games).toHaveLength(4);
      expect(requests).toBe(2);
      status = 503;
      output = JSON.stringify({ error: "Lutris export failed" });
      await expect(client.refreshLibrary()).rejects.toThrow("Lutris export failed");
      expect(database.readLibrary().games).toHaveLength(4);
      status = 200;
      output = "{}";
      await expect(client.refreshLibrary()).rejects.toThrow("JSON array");
      expect(database.readLibrary().games).toHaveLength(4);
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      await expect(client.refreshLibrary()).rejects.toThrow("host Lutris helper is unavailable");
      expect(database.readLibrary().games).toHaveLength(4);
    } finally {
      if (server.listening) await new Promise<void>((resolve) => server.close(() => resolve()));
      vi.stubEnv("LUTRIS_HOST_SOCKET", "");
    }
  });
});

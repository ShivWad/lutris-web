import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { promisify } from "node:util";
import { queryLibrary, readLibrary, replaceLibrary, rebuildDatabase } from "./database";
import { demoGames } from "./demo";
import { readHostLibrary } from "./host";
import { normalizeGames } from "./normalizer";
import { parseLutrisOutput } from "./parser";
import { calculateStats } from "./stats";
import type { LibraryPagePayload, LibraryPayload, LibraryQuery, LibraryStatsPayload } from "./types";

const runFile = promisify(execFile);
const primaryArgs = ["--list-all-service-games", "--json"] as const;
const fallbackArgs = ["-a", "-j"] as const;

function safeCommandError(error: unknown): Error {
  const value = error as NodeJS.ErrnoException & { code?: string | number; stderr?: string };
  if (value.code === "ENOENT") {
    return new Error("Lutris could not be found. Make sure `lutris` is installed and available in PATH.");
  }
  const stderr = typeof value.stderr === "string" ? value.stderr.trim().slice(0, 500) : "";
  return new Error(`Lutris command failed${value.code !== undefined ? ` (exit ${value.code})` : ""}.${stderr ? ` ${stderr}` : ""}`);
}

async function runLutris(args: readonly string[]) {
  try {
    const { stdout } = await runFile("lutris", [...args], { timeout: 60_000, maxBuffer: 32 * 1024 * 1024 });
    return stdout;
  } catch (error) {
    throw safeCommandError(error);
  }
}

async function readLibrarySource() {
  // Prefer the configured helper and surface its failures. Falling back to an
  // import here would silently replace fresh data with a stale manual export.
  if (process.env.LUTRIS_HOST_SOCKET) return readHostLibrary(process.env.LUTRIS_HOST_SOCKET);
  const importFile = process.env.LUTRIS_IMPORT_FILE;
  if (importFile) {
    try {
      return await fs.readFile(importFile, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new Error(`Library export not found at ${importFile}. On the Docker host, run: lutris --list-all-service-games --json > imports/library.json`);
      }
      throw error;
    }
  }
  try {
    return await runLutris(primaryArgs);
  } catch (primaryError) {
    try {
      return await runLutris(fallbackArgs);
    } catch {
      throw primaryError;
    }
  }
}

export async function getLibraryPage(query: LibraryQuery = {}): Promise<LibraryPagePayload> {
  return queryLibrary(query);
}

export async function getLibraryStats(): Promise<LibraryStatsPayload> {
  const library = readLibrary();
  return { stats: calculateStats(library.games), lastRefreshed: library.lastRefreshed };
}

export async function refreshLibrary(): Promise<LibraryPayload> {
  return updateLibrary(false);
}

async function loadLibrarySource(): Promise<LibraryPayload> {
  if (process.env.LUTRIS_DEMO === "1") {
    const lastRefreshed = new Date().toISOString();
    return { games: demoGames, lastRefreshed, source: "lutris", warning: "Showing illustrative demo data." };
  }
  const output = await readLibrarySource();
  return { games: normalizeGames(parseLutrisOutput(output)), lastRefreshed: new Date().toISOString(), source: "lutris" };
}

export async function rebuildLibrary(): Promise<LibraryPayload> {
  return updateLibrary(true);
}

// Hold this process-wide lock across asynchronous source reads as well as writes.
// SQLite transactions alone cannot prevent two overlapping exports finishing out of order.
const updates = globalThis as typeof globalThis & { __lutrisUpdating?: boolean };

async function updateLibrary(rebuild: boolean): Promise<LibraryPayload> {
  if (updates.__lutrisUpdating) throw new Error("A library update is already running. Try again when it finishes.");
  updates.__lutrisUpdating = true;
  try {
    const payload = await loadLibrarySource();
    (rebuild ? rebuildDatabase : replaceLibrary)(payload.games, payload.lastRefreshed!);
    return payload;
  } finally {
    updates.__lutrisUpdating = false;
  }
}

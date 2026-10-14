import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { LibraryPagePayload, LibraryQuery } from "./types";

let queryLibrary: (query?: LibraryQuery) => LibraryPagePayload;
let resetDatabase: () => void;

beforeAll(async () => {
  vi.stubEnv("LUTRIS_DEMO", "1");
  vi.resetModules();
  ({ queryLibrary, resetDatabase } = await import("./database"));
});

afterAll(async () => {
  const database = (globalThis as typeof globalThis & { __lutrisDatabase?: { close: () => void } }).__lutrisDatabase;
  database?.close();
  delete (globalThis as typeof globalThis & { __lutrisDatabase?: unknown }).__lutrisDatabase;
  vi.unstubAllEnvs();
});

describe("SQLite library index", () => {
  it("returns bounded pages and catalog metadata", () => {
    const firstPage = queryLibrary({ pageSize: 12 });
    expect(firstPage.groups).toHaveLength(12);
    expect(firstPage.total).toBeGreaterThan(12);
    expect(firstPage.entryCount).toBe(20);
    expect(firstPage.hasMore).toBe(true);
  });

  it("searches indexed metadata and applies filters", () => {
    const search = queryLibrary({ query: "crystal dyn" });
    expect(search.groups.length).toBeGreaterThan(0);
    expect(search.groups.every((group) => group.games.some((game) => game.developer === "Crystal Dynamics"))).toBe(true);

    const installedSteam = queryLibrary({ service: "steam", installation: "installed" });
    expect(installedSteam.groups.every((group) => group.games.some((game) => game.service === "steam") && group.games.some((game) => game.installed))).toBe(true);

    const titleOnly = queryLibrary({ query: "crystal dynamics", searchScope: "title" });
    expect(titleOnly.total).toBe(0);
  });

  it("sorts before applying pagination", () => {
    const page = queryLibrary({ sort: "playtime", pageSize: 12 });
    const playtimes = page.groups.map((group) => Math.max(...group.games.map((game) => game.playtimeMinutes ?? -1)));
    expect(playtimes).toEqual([...playtimes].sort((a, b) => b - a));
  });

  it("supports backlog semantics and clamps invalid pagination", () => {
    const backlog = queryLibrary({ playtime: "under2-inclusive", sort: "playtime-low" });
    expect(backlog.groups.every((group) => Math.max(0, ...group.games.map((game) => game.playtimeMinutes ?? 0)) < 120)).toBe(true);
    expect(queryLibrary({ page: Number.POSITIVE_INFINITY }).page).toBe(1);
  });

  it("keeps playtime bands aligned with the displayed hour boundaries", async () => {
    const { replaceLibrary } = await import("./database");
    const durations = [599, 600, 2999, 3000, 4999, 5999, 6000];
    try {
      replaceLibrary(durations.map((minutes) => ({
        id: minutes, name: `Duration ${minutes}`, service: "steam", installed: false, playtimeMinutes: minutes,
      })), "2026-10-14T00:00:00.000Z");
      const minutesIn = (playtime: LibraryQuery["playtime"]) => queryLibrary({ playtime }).groups
        .map((group) => group.primary.playtimeMinutes).sort((a, b) => a! - b!);
      expect(minutesIn("10to50")).toEqual([600, 2999]);
      expect(minutesIn("50to100")).toEqual([3000, 4999, 5999]);
      expect(minutesIn("over100")).toEqual([6000]);
    } finally {
      resetDatabase();
    }
  });

  it("recreates the demo index after a database reset", () => {
    resetDatabase();
    expect(queryLibrary().entryCount).toBe(20);
  });
});

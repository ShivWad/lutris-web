import { existsSync, mkdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import type { DatabaseSync as SQLiteDatabase } from "node:sqlite";
import { demoGames } from "./demo";
import { groupLibraryGames, normalizeGameTitle } from "./matching";
import { normalizeGames } from "./normalizer";
import { getLibraryRuntimeMode } from "./runtime";
import { gameServices } from "./services";
import type { LibraryGame, LibraryGameGroup, LibraryPagePayload, LibraryPayload, LibraryQuery } from "./types";

const dataDirectory = process.env.LUTRIS_DATA_DIR ?? path.join(process.cwd(), "data");
const databasePath = process.env.LUTRIS_DATABASE_PATH ?? path.join(dataDirectory, "library.sqlite");
const legacyCachePath = path.join(dataDirectory, "library-cache.json");
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as typeof import("node:sqlite");

type CountRow = { count: number };
type GroupRow = { payload: string };
type MetadataRow = { value: string };

const schema = `
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS games (
    game_key TEXT PRIMARY KEY,
    group_key TEXT NOT NULL,
    payload TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS library_groups (
    group_key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    edition TEXT,
    is_dlc INTEGER NOT NULL,
    payload TEXT NOT NULL,
    installed INTEGER NOT NULL,
    has_native INTEGER NOT NULL,
    has_windows INTEGER NOT NULL,
    has_unknown_linux INTEGER NOT NULL,
    playtime_minutes INTEGER,
    release_first TEXT,
    release_last TEXT,
    acquisition_first TEXT,
    acquisition_last TEXT,
    last_played TEXT,
    critic_score REAL,
    steam_rating REAL,
    primary_service TEXT NOT NULL,
    has_steam INTEGER NOT NULL,
    has_egs INTEGER NOT NULL,
    has_gog INTEGER NOT NULL,
    has_amazon INTEGER NOT NULL,
    has_other INTEGER NOT NULL
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS library_groups_fts USING fts5(
    group_key UNINDEXED,
    search_text,
    tokenize = 'unicode61 remove_diacritics 2'
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS library_titles_fts USING fts5(
    group_key UNINDEXED,
    search_text,
    tokenize = 'unicode61 remove_diacritics 2'
  );

  CREATE INDEX IF NOT EXISTS idx_groups_name ON library_groups(name COLLATE NOCASE);
  CREATE INDEX IF NOT EXISTS idx_games_group ON games(group_key);
  CREATE INDEX IF NOT EXISTS idx_groups_installed ON library_groups(installed);
  CREATE INDEX IF NOT EXISTS idx_groups_playtime ON library_groups(playtime_minutes DESC);
  CREATE INDEX IF NOT EXISTS idx_groups_release_last ON library_groups(release_last DESC);
  CREATE INDEX IF NOT EXISTS idx_groups_acquisition_last ON library_groups(acquisition_last DESC);
  CREATE INDEX IF NOT EXISTS idx_groups_last_played ON library_groups(last_played DESC);
  CREATE INDEX IF NOT EXISTS idx_groups_critic ON library_groups(critic_score DESC);
  CREATE INDEX IF NOT EXISTS idx_groups_steam_rating ON library_groups(steam_rating DESC);
`;

// Reuse one connection across server module reloads. This is a per-process
// singleton, so it does not coordinate multiple workers sharing a database.
const globalDatabase = globalThis as typeof globalThis & { __lutrisDatabase?: SQLiteDatabase };

function firstDate(values: Array<string | undefined>) {
  return values.filter((value): value is string => Boolean(value)).sort()[0] ?? null;
}

function lastDate(values: Array<string | undefined>) {
  return values.filter((value): value is string => Boolean(value)).sort().at(-1) ?? null;
}

function maxNumber(values: Array<number | undefined>) {
  const numbers = values.filter((value): value is number => typeof value === "number");
  return numbers.length ? Math.max(...numbers) : null;
}

function searchText(group: LibraryGameGroup) {
  return normalizeGameTitle(group.games.flatMap((game) => [game.name, game.developer, game.publisher, game.edition, ...(game.genres ?? [])]).filter(Boolean).join(" "));
}

function titleSearchText(group: LibraryGameGroup) {
  return normalizeGameTitle(group.games.flatMap((game) => [game.name, game.edition, game.parentGame]).filter(Boolean).join(" "));
}

/** Replace ownership, grouped payloads, search indexes, and metadata in one transaction. */
function replaceLibraryInDatabase(database: SQLiteDatabase, games: LibraryGame[], lastRefreshed: string) {
  const groups = groupLibraryGames(games);
  const insertGame = database.prepare("INSERT INTO games (game_key, group_key, payload) VALUES (?, ?, ?)");
  const insertGroup = database.prepare(`
    INSERT INTO library_groups (
      group_key, name, edition, is_dlc, payload, installed,
      has_native, has_windows, has_unknown_linux, playtime_minutes,
      release_first, release_last, acquisition_first, acquisition_last, last_played,
      critic_score, steam_rating, primary_service,
      has_steam, has_egs, has_gog, has_amazon, has_other
    ) VALUES (${Array.from({ length: 23 }, () => "?").join(", ")})
  `);
  const insertSearch = database.prepare("INSERT INTO library_groups_fts (group_key, search_text) VALUES (?, ?)");
  const insertTitleSearch = database.prepare("INSERT INTO library_titles_fts (group_key, search_text) VALUES (?, ?)");
  const insertMetadata = database.prepare("INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)");

  database.exec("BEGIN IMMEDIATE");
  try {
    database.exec("DELETE FROM library_groups_fts; DELETE FROM library_titles_fts; DELETE FROM games; DELETE FROM library_groups;");
    for (const group of groups) {
      const services = new Set(group.games.map((game) => game.service));
      const openCritic = maxNumber(group.games.map((game) => game.openCriticScore));
      const metacritic = maxNumber(group.games.map((game) => game.metacriticScore));
      insertGroup.run(
        group.key, group.name, group.edition ?? null, Number(group.isDlc), JSON.stringify(group),
        Number(group.games.some((game) => game.installed)),
        Number(group.games.some((game) => game.nativeLinuxSupport === true)),
        Number(group.games.some((game) => game.nativeLinuxSupport === false)),
        Number(group.games.some((game) => game.nativeLinuxSupport == null)),
        maxNumber(group.games.map((game) => game.playtimeMinutes)),
        firstDate(group.games.map((game) => game.releaseDate)), lastDate(group.games.map((game) => game.releaseDate)),
        firstDate(group.games.map((game) => game.acquisitionDate)), lastDate(group.games.map((game) => game.acquisitionDate)),
        lastDate(group.games.map((game) => game.lastPlayed)), openCritic ?? metacritic,
        maxNumber(group.games.map((game) => game.steamRatingPercent)), group.primary.service,
        Number(services.has("steam")), Number(services.has("egs")), Number(services.has("gog")),
        Number(services.has("amazon")), Number(services.has("other")),
      );
      insertSearch.run(group.key, searchText(group));
      insertTitleSearch.run(group.key, titleSearchText(group));
      // Provider IDs can repeat, even within a service. These internal snapshot
      // keys preserve every record; they are not stable identifiers across imports.
      group.games.forEach((game, index) => insertGame.run(`${group.key}:${index}`, group.key, JSON.stringify(game)));
    }
    insertMetadata.run("lastRefreshed", lastRefreshed);
    insertMetadata.run("entryCount", String(games.length));
    insertMetadata.run("initialized", "1");
    insertMetadata.run("indexVersion", "2");
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function backfillTitleSearch(database: SQLiteDatabase) {
  const titles = (database.prepare("SELECT COUNT(*) AS count FROM library_titles_fts").get() as CountRow).count;
  const groups = (database.prepare("SELECT COUNT(*) AS count FROM library_groups").get() as CountRow).count;
  if (titles > 0 || groups === 0) return;
  const insert = database.prepare("INSERT INTO library_titles_fts (group_key, search_text) VALUES (?, ?)");
  const rows = database.prepare("SELECT group_key, payload FROM library_groups").all() as Array<GroupRow & { group_key: string }>;
  database.exec("BEGIN IMMEDIATE");
  try {
    rows.forEach((row) => insert.run(row.group_key, titleSearchText(JSON.parse(row.payload) as LibraryGameGroup)));
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function importLegacyCache(database: SQLiteDatabase) {
  const count = (database.prepare("SELECT COUNT(*) AS count FROM library_groups").get() as CountRow).count;
  const initialized = database.prepare("SELECT value FROM metadata WHERE key = 'initialized'").get();
  if (count > 0 || initialized || !existsSync(legacyCachePath)) return;
  try {
    const cached = JSON.parse(readFileSync(legacyCachePath, "utf8")) as LibraryPayload;
    const games = cached.games.map((game) => normalizeGames([{ ...game, details: game.rawDetails }])[0] ?? game);
    replaceLibraryInDatabase(database, games, cached.lastRefreshed ?? new Date().toISOString());
  } catch (error) {
    console.warn("Could not migrate the legacy Lutris JSON cache.", error);
  }
}

export function getDatabase() {
  if (globalDatabase.__lutrisDatabase) return globalDatabase.__lutrisDatabase;
  if (process.env.LUTRIS_DEMO !== "1") mkdirSync(path.dirname(databasePath), { recursive: true });
  const database = new DatabaseSync(process.env.LUTRIS_DEMO === "1" ? ":memory:" : databasePath);
  try {
    database.exec(schema);
    if (process.env.LUTRIS_DEMO === "1") {
      replaceLibraryInDatabase(database, demoGames, new Date().toISOString());
    } else {
      importLegacyCache(database);
      // Recompute derived groups from cached records after grouping rules change;
      // opening the app must not invoke Lutris or synchronize any account.
      if (metadata(database, "indexVersion") !== "2") {
        const rows = database.prepare("SELECT payload FROM games ORDER BY rowid").all() as GroupRow[];
        if (rows.length) replaceLibraryInDatabase(database, rows.map((row) => JSON.parse(row.payload) as LibraryGame), metadata(database, "lastRefreshed") ?? new Date().toISOString());
      }
    }
    backfillTitleSearch(database);
  } catch (error) {
    database.close();
    throw error;
  }
  globalDatabase.__lutrisDatabase = database;
  return database;
}

export function replaceLibrary(games: LibraryGame[], lastRefreshed: string) {
  replaceLibraryInDatabase(getDatabase(), games, lastRefreshed);
}

/** Build beside the live file so a failed rebuild leaves the last successful index usable. */
export function rebuildDatabase(games: LibraryGame[], lastRefreshed: string) {
  const demo = process.env.LUTRIS_DEMO === "1";
  const temporaryPath = `${databasePath}.rebuild-${randomUUID()}`;
  if (!demo) mkdirSync(path.dirname(databasePath), { recursive: true });
  const replacement = new DatabaseSync(demo ? ":memory:" : temporaryPath);
  let closed = false;
  try {
    replacement.exec(schema);
    replaceLibraryInDatabase(replacement, games, lastRefreshed);
    if (demo) {
      globalDatabase.__lutrisDatabase?.close();
      globalDatabase.__lutrisDatabase = replacement;
      return;
    }
    // Close/checkpoint the completed replacement before touching the old index.
    replacement.exec("PRAGMA journal_mode = DELETE");
    replacement.close();
    closed = true;
    globalDatabase.__lutrisDatabase?.close();
    delete globalDatabase.__lutrisDatabase;
    renameSync(temporaryPath, databasePath);
    for (const suffix of ["-wal", "-shm"]) rmSync(`${databasePath}${suffix}`, { force: true });
  } catch (error) {
    if (!closed) replacement.close();
    throw error;
  } finally {
    if (!demo) {
      for (const suffix of ["", "-wal", "-shm", "-journal"]) rmSync(`${temporaryPath}${suffix}`, { force: true });
    }
  }
}

export function resetDatabase() {
  globalDatabase.__lutrisDatabase?.close();
  delete globalDatabase.__lutrisDatabase;
  if (process.env.LUTRIS_DEMO === "1") return;
  for (const file of [databasePath, `${databasePath}-wal`, `${databasePath}-shm`]) {
    rmSync(file, { force: true });
  }
}

function metadata(database: SQLiteDatabase, key: string) {
  return (database.prepare("SELECT value FROM metadata WHERE key = ?").get(key) as MetadataRow | undefined)?.value;
}

export function readLibrary(): LibraryPayload {
  const database = getDatabase();
  const games = database.prepare("SELECT payload FROM games ORDER BY rowid").all() as GroupRow[];
  const lastRefreshed = metadata(database, "lastRefreshed") ?? null;
  return {
    games: games.map((row) => JSON.parse(row.payload) as LibraryGame),
    lastRefreshed,
    source: games.length ? "cache" : "empty",
    warning: games.length ? (process.env.LUTRIS_DEMO === "1" ? "Showing illustrative demo data." : undefined) : "No library index yet. Refresh to read your games from Lutris.",
  };
}

// SQL identifiers/order clauses come from this allowlist, never request strings.
const sortSql: Record<NonNullable<LibraryQuery["sort"]>, string> = {
  az: "g.name COLLATE NOCASE ASC, g.group_key ASC",
  za: "g.name COLLATE NOCASE DESC, g.group_key ASC",
  "release-new": "g.release_last IS NULL, g.release_last DESC, g.name COLLATE NOCASE ASC",
  "release-old": "g.release_first IS NULL, g.release_first ASC, g.name COLLATE NOCASE ASC",
  "acquired-new": "g.acquisition_last IS NULL, g.acquisition_last DESC, g.name COLLATE NOCASE ASC",
  "acquired-old": "g.acquisition_first IS NULL, g.acquisition_first ASC, g.name COLLATE NOCASE ASC",
  playtime: "g.playtime_minutes IS NULL, g.playtime_minutes DESC, g.name COLLATE NOCASE ASC",
  "playtime-low": "COALESCE(g.playtime_minutes, 0) ASC, g.name COLLATE NOCASE ASC",
  "last-played": "g.last_played IS NULL, g.last_played DESC, g.name COLLATE NOCASE ASC",
  critic: "g.critic_score IS NULL, g.critic_score DESC, g.name COLLATE NOCASE ASC",
  "steam-rating": "g.steam_rating IS NULL, g.steam_rating DESC, g.name COLLATE NOCASE ASC",
  installed: "g.installed DESC, g.name COLLATE NOCASE ASC",
  service: "g.primary_service ASC, g.name COLLATE NOCASE ASC",
};

export function queryLibrary(query: LibraryQuery = {}): LibraryPagePayload {
  const database = getDatabase();
  const requestedPage = Math.floor(query.page ?? 1);
  const requestedPageSize = Math.floor(query.pageSize ?? 48);
  const page = Number.isFinite(requestedPage) ? Math.min(1_000_000, Math.max(1, requestedPage)) : 1;
  const pageSize = Number.isFinite(requestedPageSize) ? Math.min(100, Math.max(12, requestedPageSize)) : 48;
  const where: string[] = [];
  const parameters: Array<string | number> = [];
  const normalizedSearch = normalizeGameTitle(query.query ?? "");
  let from = "library_groups g";

  if (normalizedSearch) {
    // Quote normalized tokens and bind the FTS expression. Search means an AND
    // of token prefixes, not arbitrary FTS syntax or a substring match.
    const searchTable = query.searchScope === "title" ? "library_titles_fts" : "library_groups_fts";
    from += ` JOIN ${searchTable} f ON f.group_key = g.group_key`;
    where.push(`${searchTable} MATCH ?`);
    parameters.push(normalizedSearch.split(" ").map((word) => `"${word}"*`).join(" AND "));
  } else if (query.query?.trim()) {
    where.push("0");
  }
  if (query.service && query.service !== "all") {
    // Match any ownership record while returning the complete cross-store group.
    where.push("EXISTS (SELECT 1 FROM games s WHERE s.group_key = g.group_key AND json_extract(s.payload, '$.service') = ?)");
    parameters.push(query.service);
  }
  if (query.installation === "installed") where.push("g.installed = 1");
  if (query.installation === "not-installed") where.push("g.installed = 0");
  // Backlog's inclusive filters intentionally include unknown playtime. This is
  // a browsing convention, not evidence of an account-wide "never played" total.
  if (query.playtime === "never") where.push("COALESCE(g.playtime_minutes, 0) = 0");
  if (query.playtime === "under2") where.push("g.playtime_minutes > 0 AND g.playtime_minutes < 120");
  if (query.playtime === "under2-inclusive") where.push("COALESCE(g.playtime_minutes, 0) < 120");
  if (query.playtime === "2to10") where.push("g.playtime_minutes >= 120 AND g.playtime_minutes < 600");
  if (query.playtime === "10to50") where.push("g.playtime_minutes >= 600 AND g.playtime_minutes < 3000");
  if (query.playtime === "50to100") where.push("g.playtime_minutes >= 3000 AND g.playtime_minutes < 6000");
  if (query.playtime === "over100") where.push("g.playtime_minutes >= 6000");
  if (query.linux === "native") where.push("g.has_native = 1");
  if (query.linux === "windows") where.push("g.has_windows = 1");
  if (query.linux === "unknown") where.push("g.has_unknown_linux = 1");

  const whereSql = where.length ? ` WHERE ${where.join(" AND ")}` : "";
  const total = (database.prepare(`SELECT COUNT(*) AS count FROM ${from}${whereSql}`).get(...parameters) as CountRow).count;
  const rows = database.prepare(`SELECT g.payload FROM ${from}${whereSql} ORDER BY ${sortSql[query.sort ?? "az"]} LIMIT ? OFFSET ?`).all(...parameters, pageSize, (page - 1) * pageSize) as GroupRow[];
  // Header counts describe the whole catalog, independent of the active filters.
  const summary = database.prepare(`
    SELECT COUNT(*) AS all_count, SUM(installed) AS installed_count,
      SUM(has_steam) AS steam_count, SUM(has_egs) AS egs_count,
      SUM(has_gog) AS gog_count, SUM(has_amazon) AS amazon_count,
      SUM(playtime_minutes IS NOT NULL) AS playtime_count
    FROM library_groups
  `).get() as Record<string, number | null>;
  const entryCount = Number(metadata(database, "entryCount") ?? 0);
  const uniqueCount = summary.all_count ?? 0;
  const serviceCounts = Object.fromEntries(gameServices.map((service) => [service, 0])) as Record<(typeof gameServices)[number], number>;
  const serviceRows = database.prepare("SELECT json_extract(payload, '$.service') AS service, COUNT(DISTINCT group_key) AS count FROM games GROUP BY service").all() as Array<{ service: (typeof gameServices)[number]; count: number }>;
  for (const row of serviceRows) serviceCounts[row.service] = row.count;

  return {
    groups: rows.map((row) => JSON.parse(row.payload) as LibraryGameGroup),
    total, page, pageSize, hasMore: page * pageSize < total,
    entryCount, uniqueCount, hasPlaytime: (summary.playtime_count ?? 0) > 0,
    counts: {
      all: uniqueCount,
      installed: summary.installed_count ?? 0,
      ...serviceCounts,
    },
    lastRefreshed: metadata(database, "lastRefreshed") ?? null,
    source: uniqueCount ? "cache" : "empty",
    runtimeMode: getLibraryRuntimeMode(),
    warning: uniqueCount ? (process.env.LUTRIS_DEMO === "1" ? "Showing illustrative demo data." : undefined) : "No library index yet. Refresh to read your games from Lutris.",
  };
}

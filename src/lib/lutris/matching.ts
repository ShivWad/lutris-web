import type { LibraryGame, LibraryGameGroup } from "./types";

const EDITIONS: Array<[RegExp, string]> = [
  [/\b(?:game of the year edition|game of the year|goty edition|goty)\b/i, "Game of the Year Edition"],
  [/\bdefinitive edition\b/i, "Definitive Edition"],
  [/\bcomplete edition\b/i, "Complete Edition"],
  [/\bultimate edition\b/i, "Ultimate Edition"],
  [/\bdeluxe edition\b/i, "Deluxe Edition"],
  [/\bgold edition\b/i, "Gold Edition"],
  [/\bcollector'?s edition\b/i, "Collector's Edition"],
  [/\benhanced edition\b/i, "Enhanced Edition"],
  [/\b20 year celebration\b/i, "20 Year Celebration"],
  [/\bremastered\b/i, "Remastered"],
  [/\(classic\)|\bclassic edition\b/i, "Classic"],
];

const DLC_TERMS = /\b(?:dlc|expansion|season pass|soundtrack|artbook|skin pack|map pack|content pack)\b/i;

export function normalizeGameTitle(title: string): string {
  // Remove accent differences while preserving non-Latin letters and numbers.
  // ASCII-only stripping would collapse unrelated titles into the same group.
  return title
    .replace(/[™®©]/g, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function detectEdition(title: string, rawDetails?: unknown): string | undefined {
  const raw = rawDetails && typeof rawDetails === "object" ? rawDetails as Record<string, unknown> : {};
  const explicit = typeof raw.edition === "string" ? raw.edition.trim() : undefined;
  if (explicit) return explicit;
  return EDITIONS.find(([pattern]) => pattern.test(title))?.[1];
}

export function baseGameTitle(title: string): string {
  let base = title.replace(/[™®©]/g, "");
  for (const [pattern] of EDITIONS) base = base.replace(pattern, "");
  return base.replace(/\s*[:\-–—]\s*$/, "").replace(/\s+/g, " ").trim();
}

export function detectDlc(title: string, rawDetails?: unknown): boolean {
  const raw = rawDetails && typeof rawDetails === "object" ? rawDetails as Record<string, unknown> : {};
  if (raw.isDlc === true || raw.is_dlc === true) return true;
  if (Array.isArray(raw.mainGameItemList) && raw.mainGameItemList.length > 0) return true;
  const type = [raw.itemType, raw.entitlementType, raw.productType, raw.category].filter(Boolean).join(" ");
  return /\b(?:addon|add-on|dlc|expansion)\b/i.test(type) || DLC_TERMS.test(title);
}

/** Group ownership records by title, edition, and content type; never merge editions or DLC. */
export function groupLibraryGames(games: LibraryGame[]): LibraryGameGroup[] {
  const grouped = new Map<string, LibraryGame[]>();
  for (const game of games) {
    const edition = game.edition ?? detectEdition(game.name, game.rawDetails);
    const isDlc = game.isDlc ?? detectDlc(game.name, game.rawDetails);
    const key = `${normalizeGameTitle(baseGameTitle(game.name))}::${normalizeGameTitle(edition ?? "base")}::${isDlc ? "dlc" : "game"}`;
    grouped.set(key, [...(grouped.get(key) ?? []), { ...game, edition, isDlc }]);
  }
  return [...grouped.entries()].map(([key, entries]) => {
    // The primary record supplies display defaults, not canonical ownership.
    // All entries remain available to filters, detail panels, and statistics.
    const primary = [...entries].sort((a, b) => Number(Boolean(b.coverUrl)) - Number(Boolean(a.coverUrl)) || Number(b.installed) - Number(a.installed) || (b.playtimeMinutes ?? 0) - (a.playtimeMinutes ?? 0))[0];
    return { key, name: baseGameTitle(primary.name), edition: primary.edition, isDlc: entries.some((game) => game.isDlc), games: entries, primary };
  });
}

export function groupDuplicates(games: LibraryGame[]) {
  return groupLibraryGames(games)
    .filter((group) => new Set(group.games.map((game) => game.service)).size > 1)
    .map((group) => ({ title: group.key, games: group.games }));
}

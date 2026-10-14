import { groupDuplicates, groupLibraryGames, normalizeGameTitle } from "./matching";
import { gameServices } from "./services";
import type { GameService, LibraryGame, LibraryStats } from "./types";

/** Entry/service totals count ownership records; unique and top-played lists count editions. */
export function calculateStats(games: LibraryGame[]): LibraryStats {
  const duplicateGroups = groupDuplicates(games);
  const groupedGames = groupLibraryGames(games);
  const byService = Object.fromEntries(gameServices.map((service) => [service, 0])) as Record<GameService, number>;
  games.forEach((game) => { byService[game.service] += 1; });

  // This is a title-token suggestion heuristic, not authoritative franchise metadata.
  const franchises = new Map<string, number>();
  groupedGames.forEach((group) => {
    const words = normalizeGameTitle(group.name).split(" ");
    const key = words.find((word) => word.length > 5) ?? words[0];
    if (key) franchises.set(key, (franchises.get(key) ?? 0) + 1);
  });

  return {
    total: games.length,
    uniqueGames: groupedGames.length,
    installed: games.filter((game) => game.installed).length,
    uninstalled: games.filter((game) => !game.installed).length,
    withPlaytime: games.filter((game) => game.playtimeMinutes !== undefined && game.playtimeMinutes > 0).length,
    neverPlayedSteam: games.filter((game) => game.service === "steam" && !game.playtimeMinutes).length,
    totalSteamPlaytimeMinutes: games.filter((game) => game.service === "steam").reduce((sum, game) => sum + (game.playtimeMinutes ?? 0), 0),
    byService,
    topPlayed: groupedGames.map((group) => ({ ...group.primary, playtimeMinutes: Math.max(0, ...group.games.map((game) => game.playtimeMinutes ?? 0)) })).filter((game) => game.playtimeMinutes).sort((a, b) => (b.playtimeMinutes ?? 0) - (a.playtimeMinutes ?? 0)).slice(0, 10),
    duplicateGroups,
    franchiseGroups: [...franchises.entries()].filter(([, count]) => count > 1).map(([title, count]) => ({ title, count })).sort((a, b) => b.count - a.count),
  };
}

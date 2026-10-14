import type { GameService } from "./services";
export type { GameService } from "./services";
export type LibraryRuntimeMode = "demo" | "import" | "local";

/** One store ownership record. Optional fields represent unavailable provider metadata. */
export interface LibraryGame {
  id: number | string;
  name: string;
  slug?: string;
  service: GameService;
  appId?: string;
  installed: boolean;
  coverUrl?: string;
  iconUrl?: string;
  releaseDate?: string;
  developer?: string;
  publisher?: string;
  genres?: string[];
  categories?: string[];
  platforms?: string[];
  playtimeMinutes?: number; // undefined = unknown; 0 = an explicit zero supplied by the source.
  nativeLinuxSupport?: boolean | null; // null/undefined = unknown, not Windows-only.
  description?: string;
  acquisitionDate?: string;
  lastPlayed?: string;
  metacriticScore?: number;
  openCriticScore?: number;
  steamRatingPercent?: number;
  edition?: string;
  isDlc?: boolean;
  parentGame?: string;
  rawDetails?: unknown; // Retained for the metadata ledger; private provider data is not redacted.
}

/** A browsable edition containing every matching store record, including the display primary. */
export interface LibraryGameGroup {
  key: string;
  name: string;
  edition?: string;
  isDlc: boolean;
  games: LibraryGame[];
  primary: LibraryGame;
}

export interface LutrisRecord {
  id?: number | string;
  slug?: string;
  name?: string;
  service?: string;
  appid?: number | string;
  appId?: number | string;
  installed?: boolean | number | string;
  details?: unknown;
  [key: string]: unknown;
}

export interface LibraryPayload {
  games: LibraryGame[];
  lastRefreshed: string | null;
  source: "cache" | "lutris" | "empty";
  warning?: string;
}

export type LibrarySort = "az" | "za" | "release-new" | "release-old" | "acquired-new" | "acquired-old" | "playtime" | "playtime-low" | "last-played" | "critic" | "steam-rating" | "installed" | "service";

export interface LibraryQuery {
  page?: number;
  pageSize?: number;
  query?: string;
  searchScope?: "all" | "title";
  service?: "all" | GameService;
  installation?: "all" | "installed" | "not-installed";
  playtime?: "any" | "never" | "under2" | "under2-inclusive" | "2to10" | "10to50" | "50to100" | "over100";
  linux?: "all" | "native" | "windows" | "unknown";
  sort?: LibrarySort;
}

export interface LibraryCounts {
  all: number;
  installed: number;
  steam: number;
  egs: number;
  gog: number;
  amazon: number;
  ubisoft: number;
  ea_app: number;
  other: number;
}

export interface LibraryPagePayload {
  groups: LibraryGameGroup[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  entryCount: number;
  uniqueCount: number;
  hasPlaytime: boolean;
  counts: LibraryCounts;
  lastRefreshed: string | null;
  source: "cache" | "empty";
  runtimeMode: LibraryRuntimeMode;
  warning?: string;
}

export interface LibraryStats {
  total: number;
  uniqueGames: number;
  installed: number;
  uninstalled: number;
  withPlaytime: number;
  neverPlayedSteam: number;
  totalSteamPlaytimeMinutes: number;
  byService: Record<GameService, number>;
  topPlayed: LibraryGame[];
  duplicateGroups: Array<{ title: string; games: LibraryGame[] }>;
  franchiseGroups: Array<{ title: string; count: number }>;
}

export interface LibraryStatsPayload {
  stats: LibraryStats;
  lastRefreshed: string | null;
}

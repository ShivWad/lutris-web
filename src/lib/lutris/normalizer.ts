import { parseNestedDetails } from "./parser";
import { detectDlc, detectEdition } from "./matching";
import type { GameService, LibraryGame, LutrisRecord } from "./types";

type AnyRecord = Record<string, unknown>;

function object(value: unknown): AnyRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as AnyRecord : {};
}

function string(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
}

function number(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function strings(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result = value.map((item) => string(typeof item === "object" ? object(item).name : item)).filter(Boolean) as string[];
  return result.length ? result : undefined;
}

function platforms(value: unknown): string[] | undefined {
  const listed = strings(value);
  if (listed) return listed;
  if (typeof value === "string" && value.trim()) return [value.trim()];
  const entries = Object.entries(object(value))
    .filter(([, supported]) => supported === true || supported === 1 || supported === "1" || supported === "true")
    .map(([platform]) => platform);
  return entries.length ? entries : undefined;
}

function first(...values: unknown[]): string | undefined {
  for (const value of values) {
    const found = string(value);
    if (found) return found;
  }
}

function date(value: unknown): string | undefined {
  if (value && typeof value === "object") return date(object(value).date ?? object(value).value);
  if (typeof value !== "number" && typeof value !== "string") return undefined;
  if (typeof value === "string" && !value.trim()) return undefined;
  const numeric = typeof value === "number" || /^\d+(?:\.\d+)?$/.test(String(value).trim()) ? Number(value) : undefined;
  if (numeric !== undefined && (!Number.isFinite(numeric) || numeric <= 0)) return undefined;
  // Providers mix Unix seconds, milliseconds, and date strings. ISO UTC output
  // also makes SQLite's textual date ordering agree with chronological order.
  const parsed = new Date(numeric !== undefined ? (numeric < 10_000_000_000 ? numeric * 1000 : numeric) : value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : undefined;
}

function url(value: unknown): string | undefined {
  const found = string(value);
  return found?.startsWith("//") ? `https:${found}` : found;
}

function gogCoverUrl(value: unknown): string | undefined {
  const found = url(value);
  if (!found) return undefined;
  return /^https:\/\/images(?:-\d+)?\.gog-statics\.com\/[a-f0-9]+$/i.test(found)
    ? `${found}_glx_vertical_cover.webp`
    : found;
}

function imageFrom(value: unknown, tall = false): string | undefined {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return undefined;
  const images = value.map(object);
  const preferred = images.find((item) => tall && /portrait|tall|cover|DieselGameBoxTall/i.test(first(item.type, item.name) ?? ""));
  return first(preferred?.url, preferred?.src, images[0]?.url, images[0]?.src);
}

export function normalizeService(value: unknown): GameService {
  const service = String(value ?? "").trim().toLowerCase();
  if (service.includes("steam")) return "steam";
  if (service === "egs" || service.includes("epic")) return "egs";
  if (service.includes("gog")) return "gog";
  if (service.includes("amazon") || service === "prime") return "amazon";
  if (service.includes("ubisoft") || service === "uplay") return "ubisoft";
  if (["ea", "ea_app", "ea app", "origin"].includes(service)) return "ea_app";
  return "other";
}

/** Map cached provider fields only; missing metadata stays unknown, with raw details retained. */
export function normalizeGame(record: LutrisRecord, index = 0): LibraryGame {
  const rawDetails = parseNestedDetails(record.details);
  const details = object(rawDetails);
  const service = normalizeService(record.service ?? details.service);
  const resolvedName = first(record.name, details.name, details.title) ?? "Untitled game";
  const parent = Array.isArray(details.mainGameItemList) ? object(details.mainGameItemList[0]) : {};
  const common: LibraryGame = {
    id: first(record.id, record.appid, record.appId) ?? `${service}-${index}`,
    name: resolvedName,
    slug: first(record.slug),
    service,
    appId: first(record.appid, record.appId, details.appid, details.appId, details.productId, details.product_id, details.spaceId, details.installId),
    installed: record.installed === true || record.installed === 1 || record.installed === "1" || record.installed === "true",
    acquisitionDate: date(details.acquisitionDate ?? details.acquisition_date ?? details.entitlementDateFromEpoch),
    lastPlayed: date(details.lastPlayed ?? details.last_played ?? details.rtime_last_played),
    metacriticScore: number(details.metacriticScore ?? details.metacritic_score ?? object(details.metacritic).score),
    openCriticScore: number(details.openCriticScore ?? details.opencritic_score ?? object(details.openCritic).score),
    steamRatingPercent: number(details.steamRatingPercent ?? details.percent_positive ?? details.rating_percent),
    edition: detectEdition(resolvedName, rawDetails),
    isDlc: detectDlc(resolvedName, rawDetails),
    parentGame: first(details.parentGame, details.parent_game, parent.title, parent.name),
    rawDetails,
  };

  if (service === "steam") {
    // These Steam fields are minutes. Epic/GOG service exports have no verified
    // equivalent here; do not infer zero or merge Lutris's separate local hours.
    const playtime = number(details.playtime_forever ?? details.playtime);
    const steamAppId = first(record.appid, record.appId, details.appid, details.appId);
    const iconHash = first(details.img_icon_url, details.icon);
    const supportedPlatforms = platforms(details.supportedPlatforms ?? details.platforms ?? details.platform);
    return {
      ...common,
      name: first(details.name, common.name)!,
      releaseDate: date(details.releaseDate ?? details.release_date),
      playtimeMinutes: playtime,
      iconUrl: first(details.icon_url, iconHash && steamAppId ? `https://media.steampowered.com/steamcommunity/public/images/apps/${steamAppId}/${iconHash}.jpg` : undefined),
      coverUrl: url(first(details.coverUrl, details.cover, details.logo, steamAppId ? `https://cdn.akamai.steamstatic.com/steam/apps/${steamAppId}/library_600x900_2x.jpg` : undefined)),
      developer: first(details.developer),
      publisher: first(details.publisher),
      genres: strings(details.genres),
      platforms: supportedPlatforms,
      nativeLinuxSupport: typeof details.nativeLinuxSupport === "boolean" ? details.nativeLinuxSupport : supportedPlatforms ? supportedPlatforms.some((platform) => /linux/i.test(platform)) : null,
      description: first(details.description, details.short_description),
    };
  }

  if (service === "egs") {
    const platforms = strings(details.supportedPlatforms ?? details.supported_platforms ?? details.platform);
    const release = Array.isArray(details.releaseInfo) ? object(details.releaseInfo[0]) : {};
    return {
      ...common,
      name: first(details.title, common.name)!,
      coverUrl: imageFrom(details.keyImages, true) ?? first(details.cover, details.image),
      developer: first(details.developer, object(details.seller).name),
      publisher: first(details.publisher),
      acquisitionDate: date(details.acquisitionDate ?? details.acquisition_date),
      releaseDate: date(details.releaseDate ?? details.release_date ?? release.releaseDate ?? release.dateAdded),
      description: first(details.description, details.shortDescription),
      genres: strings(details.genres),
      platforms,
      nativeLinuxSupport: platforms ? platforms.some((p) => /linux/i.test(p)) : null,
    };
  }

  if (service === "gog") {
    const supportedPlatforms = platforms(details.platforms ?? details.worksOn);
    return {
      ...common,
      name: first(details.title, common.name)!,
      coverUrl: gogCoverUrl(first(details.cover, details.image, object(details.images).cover)),
      releaseDate: date(details.releaseDate ?? details.release_date ?? details.releaseDateTimestamp),
      developer: first(details.developer),
      publisher: first(details.publisher),
      genres: strings(details.genres ?? details.categories),
      categories: strings(details.categories),
      platforms: supportedPlatforms,
      nativeLinuxSupport: supportedPlatforms ? supportedPlatforms.some((platform) => /linux/i.test(platform)) : null,
      description: first(details.description),
    };
  }

  if (service === "amazon") {
    const product = object(details.product);
    const productDetail = object(product.productDetail);
    const amazonDetails = object(productDetail.details);
    const platforms = strings(details.supportedPlatforms ?? details.platforms ?? amazonDetails.supportedPlatforms);
    const amazonName = first(details.title, product.title, common.name)!;
    return {
      ...common,
      name: amazonName,
      edition: detectEdition(amazonName, rawDetails),
      isDlc: detectDlc(amazonName, rawDetails),
      coverUrl: url(first(details.cover, details.image, details.productImage, productDetail.iconUrl, amazonDetails.pgCrownImageUrl, amazonDetails.backgroundUrl1)),
      developer: first(details.developer, amazonDetails.developer),
      publisher: first(details.publisher, amazonDetails.publisher),
      genres: strings(details.genres ?? amazonDetails.genres),
      categories: strings(details.gameModes ?? details.game_modes ?? amazonDetails.gameModes),
      platforms,
      releaseDate: date(details.releaseDate ?? details.release_date ?? amazonDetails.releaseDate),
      acquisitionDate: date(details.entitlementDateFromEpoch ?? common.acquisitionDate),
      nativeLinuxSupport: platforms ? platforms.some((p) => /linux/i.test(p)) : null,
      description: first(details.description, product.description, amazonDetails.shortDescription),
    };
  }

  return {
    ...common,
    coverUrl: url(first(details.cover, details.image, details.coverUrl,
      service === "ubisoft" && string(details.thumbImage) ? `https://static3.cdn.ubi.com/orbit/uplay_launcher_3_0/assets/${string(details.thumbImage)}` : undefined)),
    developer: first(details.developer),
    publisher: first(details.publisher),
    releaseDate: date(details.releaseDate ?? details.release_date),
    genres: strings(details.genres),
    platforms: platforms(details.supportedPlatforms ?? details.platforms ?? details.platform),
    description: first(details.description),
    nativeLinuxSupport: null,
  };
}

export function normalizeGames(records: LutrisRecord[]): LibraryGame[] {
  return records.map(normalizeGame);
}

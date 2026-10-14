import { describe, expect, it } from "vitest";
import { normalizeGame, normalizeService } from "./normalizer";
import { parseLutrisOutput, parseNestedDetails } from "./parser";

describe("Lutris parsing", () => {
  it("recognizes Ubisoft Connect and EA provider IDs without merging them into Other", () => {
    for (const service of ["ubisoft", "Ubisoft Connect", "uplay"]) expect(normalizeService(service)).toBe("ubisoft");
    for (const service of ["ea_app", "EA app", "origin"]) expect(normalizeService(service)).toBe("ea_app");
    const game = normalizeGame({ id: 42, name: "Ubisoft game", service: "ubisoft", details: { spaceId: "space-42", coverUrl: "https://example.test/cover.jpg" } });
    expect(game.service).toBe("ubisoft");
    expect(game.appId).toBe("space-42");
    expect(game.coverUrl).toBe("https://example.test/cover.jpg");
    expect(normalizeService("unrecognized-store")).toBe("other");
  });
  it("parses array and envelope output", () => {
    expect(parseLutrisOutput('[{"id":1}]')).toHaveLength(1);
    expect(parseLutrisOutput('{"games":[{"id":1}]}')).toHaveLength(1);
  });
  it.each(["", "   ", "{}", "null", "42", '{"error":"unavailable"}', "[null]", "[[]]", "[1]"])("rejects invalid imports instead of clearing the index: %s", (output) => {
    expect(() => parseLutrisOutput(output)).toThrow();
  });
  it("accepts explicitly empty libraries", () => {
    expect(parseLutrisOutput("[]")).toEqual([]);
    expect(parseLutrisOutput('{"games":[]}')).toEqual([]);
  });
  it("does not include private export content in parse errors", () => {
    expect(() => parseLutrisOutput('secret-account-token')).toThrow("Lutris returned invalid JSON. The existing library was kept.");
  });
  it.each([NaN, Infinity, 1e100, -1, 0, "not a date", ""])("ignores invalid or unset dates: %s", (value) => {
    expect(normalizeGame({ details: { acquisitionDate: value } }).acquisitionDate).toBeUndefined();
  });
  it("normalizes dates consistently for chronological sorting", () => {
    expect(normalizeGame({ details: { acquisitionDate: "1700000000" } }).acquisitionDate).toBe("2023-11-14T22:13:20.000Z");
    expect(normalizeGame({ service: "steam", details: { release_date: { date: "2024-01-02" } } }).releaseDate).toBe("2024-01-02T00:00:00.000Z");
  });
  it("keeps malformed nested details", () => {
    expect(parseNestedDetails("{not-json")).toBe("{not-json");
    expect(normalizeGame({ id: 1, name: "Still here", details: "{bad" }).name).toBe("Still here");
  });
  it("converts Steam playtime to normalized minutes", () => {
    expect(normalizeGame({ id: 1, name: "Portal", service: "steam", details: '{"playtime_forever":9625}' }).playtimeMinutes).toBe(9625);
  });
  it("extracts nested Amazon metadata and acquisition time", () => {
    const game = normalizeGame({ id: 2, name: "Example", service: "amazon", details: { entitlementDateFromEpoch: 1737969986459, product: { title: "Example Gold Edition", productDetail: { iconUrl: "https://example.test/cover.jpg", details: { developer: "Studio", genres: ["Action"], releaseDate: "2024-01-02T00:00:00Z" } } } } });
    expect(game.developer).toBe("Studio");
    expect(game.edition).toBe("Gold Edition");
    expect(game.acquisitionDate).toContain("2025");
  });
  it("expands bare GOG image hashes into vertical cover URLs", () => {
    const hash = "3987d42ccbd6c61f8a4881f3f48e40913f75e0254ed794653f6b8972d964b6dc";
    const game = normalizeGame({ id: 3, name: "GOG Game", service: "gog", details: { image: `//images-1.gog-statics.com/${hash}` } });
    expect(game.coverUrl).toBe(`https://images-1.gog-statics.com/${hash}_glx_vertical_cover.webp`);
  });
  it("extracts optional ratings and last-played metadata", () => {
    const game = normalizeGame({ id: 4, name: "Rated", service: "steam", details: { playtime_forever: 60, rtime_last_played: 1_700_000_000, metacritic_score: 88, percent_positive: 94 } });
    expect(game.lastPlayed).toContain("2023");
    expect(game.metacriticScore).toBe(88);
    expect(game.steamRatingPercent).toBe(94);
  });
  it("normalizes provider platform metadata", () => {
    const epic = normalizeGame({ id: 5, name: "Linux Game", service: "egs", details: { supportedPlatforms: ["Windows", "Linux"] } });
    const gog = normalizeGame({ id: 6, name: "Windows Game", service: "gog", details: { worksOn: { Windows: true, Linux: false } } });
    expect(epic.platforms).toEqual(["Windows", "Linux"]);
    expect(epic.nativeLinuxSupport).toBe(true);
    expect(gog.platforms).toEqual(["Windows"]);
    expect(gog.nativeLinuxSupport).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { baseGameTitle, detectDlc, detectEdition, groupDuplicates, groupLibraryGames, normalizeGameTitle } from "./matching";
import type { LibraryGame } from "./types";

describe("normalizeGameTitle", () => {
  it("preserves non-Latin titles and removes accents without splitting words", () => {
    expect(normalizeGameTitle("Pokémon")).toBe("pokemon");
    expect(normalizeGameTitle("原神")).toBe("原神");
    expect(normalizeGameTitle("原神")).not.toBe(normalizeGameTitle("明日方舟"));
    expect(normalizeGameTitle("कल")).not.toBe(normalizeGameTitle("काला"));
  });
  it("removes marks and normalizes punctuation and casing", () => {
    expect(normalizeGameTitle("Tomb Raider™: Game of the Year Edition")).toBe("tomb raider game of the year edition");
  });
  it("keeps materially distinct edition names", () => {
    expect(normalizeGameTitle("Mafia II")).not.toBe(normalizeGameTitle("Mafia II: Definitive Edition"));
  });
});

describe("edition and DLC detection", () => {
  it("canonicalizes equivalent GOTY labels", () => {
    expect(detectEdition("Tomb Raider GOTY")).toBe("Game of the Year Edition");
    expect(baseGameTitle("Tomb Raider GAME OF THE YEAR EDITION")).toBe("Tomb Raider");
  });
  it("keeps definitive editions separate while merging same editions across stores", () => {
    const games = [
      { id: 1, name: "Mafia II", service: "steam", installed: false },
      { id: 2, name: "Mafia II: Definitive Edition", service: "gog", installed: false },
      { id: 3, name: "Tomb Raider GOTY", service: "gog", installed: false },
      { id: 4, name: "Tomb Raider Game of the Year Edition", service: "egs", installed: false },
    ] satisfies LibraryGame[];
    expect(groupLibraryGames(games)).toHaveLength(3);
    expect(groupLibraryGames(games).find((group) => group.edition === "Game of the Year Edition")?.games).toHaveLength(2);
  });
  it("recognizes explicit content products", () => {
    expect(detectDlc("Control Season Pass")).toBe(true);
    expect(detectDlc("The Foundation", { mainGameItemList: [{ title: "Control" }] })).toBe(true);
  });
});

describe("groupDuplicates", () => {
  it("only returns title matches owned across different services", () => {
    const games = [
      { id: 1, name: "Control", service: "steam", installed: false },
      { id: 2, name: "Control®", service: "gog", installed: false },
      { id: 3, name: "Control", service: "steam", installed: true },
    ] satisfies LibraryGame[];
    expect(groupDuplicates(games)).toHaveLength(1);
    expect(groupDuplicates(games)[0].games).toHaveLength(3);
  });
});

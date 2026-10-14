import type { LibraryGame } from "./types";

export const demoGames: LibraryGame[] = [
  { id: 1, name: "Tomb Raider", service: "steam", installed: true, developer: "Crystal Dynamics", publisher: "Square Enix", releaseDate: "2013-03-05", genres: ["Action", "Adventure"], playtimeMinutes: 9625, lastPlayed: "2026-07-11T18:20:00Z", metacriticScore: 86, steamRatingPercent: 96, nativeLinuxSupport: true, description: "A cinematic action-adventure centered on Lara Croft's first expedition." },
  { id: 2, name: "Tomb Raider", service: "egs", installed: false, developer: "Crystal Dynamics", publisher: "Square Enix", releaseDate: "2013-03-05", acquisitionDate: "2022-01-06T03:57:35Z", genres: ["Action", "Adventure"], nativeLinuxSupport: false },
  { id: 3, name: "Rise of the Tomb Raider", service: "steam", installed: false, developer: "Crystal Dynamics", playtimeMinutes: 585, releaseDate: "2016-02-09", nativeLinuxSupport: true },
  { id: 4, name: "Shadow of the Tomb Raider", service: "steam", installed: true, developer: "Eidos-Montréal", playtimeMinutes: 2340, releaseDate: "2018-09-14", nativeLinuxSupport: true },
  { id: 5, name: "Control", service: "egs", installed: false, developer: "Remedy Entertainment", publisher: "505 Games", releaseDate: "2019-08-27", acquisitionDate: "2021-06-11T05:12:29Z", openCriticScore: 84, genres: ["Action"], nativeLinuxSupport: false },
  { id: 6, name: "Control", service: "gog", installed: false, developer: "Remedy Entertainment", publisher: "505 Games", releaseDate: "2019-08-27", nativeLinuxSupport: false },
  { id: 7, name: "Disco Elysium", service: "gog", installed: true, developer: "ZA/UM", releaseDate: "2019-10-15", genres: ["RPG", "Narrative"], nativeLinuxSupport: false },
  { id: 8, name: "Hades", service: "egs", installed: false, developer: "Supergiant Games", releaseDate: "2020-09-17", genres: ["Action", "Roguelike"], nativeLinuxSupport: false },
  { id: 9, name: "The Witcher 3: Wild Hunt", service: "gog", installed: false, developer: "CD PROJEKT RED", playtimeMinutes: 7240, releaseDate: "2015-05-18", genres: ["RPG"], nativeLinuxSupport: false },
  { id: 10, name: "Baldur's Gate 3", service: "steam", installed: true, developer: "Larian Studios", playtimeMinutes: 4310, releaseDate: "2023-08-03", genres: ["RPG", "Strategy"], nativeLinuxSupport: false },
  { id: 11, name: "A Plague Tale: Innocence", service: "amazon", installed: false, developer: "Asobo Studio", publisher: "Focus Entertainment", releaseDate: "2019-05-14", genres: ["Adventure"], nativeLinuxSupport: false },
  { id: 12, name: "Celeste", service: "other", installed: false, developer: "Maddy Makes Games", playtimeMinutes: 0, releaseDate: "2018-01-25", genres: ["Platformer"], nativeLinuxSupport: true },
  { id: 13, name: "Mafia II", service: "steam", installed: false, developer: "2K Czech", releaseDate: "2010-08-24", nativeLinuxSupport: false },
  { id: 14, name: "Mafia II: Definitive Edition", service: "gog", installed: false, developer: "Hangar 13", releaseDate: "2020-05-19", nativeLinuxSupport: false },
  { id: 15, name: "Into the Breach", service: "amazon", installed: false, developer: "Subset Games", playtimeMinutes: 110, releaseDate: "2018-02-27", genres: ["Strategy"], nativeLinuxSupport: true },
  { id: 16, name: "Outer Wilds", service: "steam", installed: false, developer: "Mobius Digital", playtimeMinutes: 45, releaseDate: "2019-05-28", genres: ["Adventure"], nativeLinuxSupport: false },
  { id: 17, name: "Death Stranding", service: "egs", installed: false, developer: "KOJIMA PRODUCTIONS", releaseDate: "2020-07-14", genres: ["Adventure"], nativeLinuxSupport: false },
  { id: 18, name: "Prey", service: "gog", installed: false, developer: "Arkane Studios", playtimeMinutes: 870, releaseDate: "2017-05-05", genres: ["Action"], nativeLinuxSupport: false },
  { id: 19, name: "Loop Hero", service: "amazon", installed: false, developer: "Four Quarters", releaseDate: "2021-03-04", genres: ["RPG", "Strategy"], nativeLinuxSupport: false },
  { id: 20, name: "Portal 2", service: "steam", installed: true, developer: "Valve", playtimeMinutes: 1810, releaseDate: "2011-04-18", genres: ["Puzzle"], nativeLinuxSupport: true },
];

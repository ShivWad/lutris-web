Build a local-first web app for Linux that lets me browse, search, filter, and inspect all games I own across services connected to Lutris.

## Goal

The app should act as a clean web UI over the Lutris CLI.

It must not manage, install, uninstall, launch, modify, or delete games in the first version.

It should primarily read data from Lutris, normalize it, and display it nicely.

The main source of truth should be:

```bash
lutris --list-all-service-games --json
```

or:

```bash
lutris -a -j
```

The returned data includes games from services such as:

- Steam
- Epic Games Store
- GOG
- Amazon Games
- potentially other Lutris-connected services

Example object shape:

```json
{
  "id": 1360,
  "slug": "a-plague-tale-innocence",
  "name": "A Plague Tale: Innocence",
  "service": "egs",
  "appid": "...",
  "installed": false,
  "details": "{...}"
}
```

Note that `details` may itself be a JSON string and may differ significantly between services.

---

# Tech stack

Use:

- Next.js
- TypeScript
- React
- Tailwind CSS
- shadcn/ui where useful
- Node.js server-side APIs
- No external database initially

The app will run locally on the same Linux machine where Lutris is installed.

Do not call Lutris CLI from the browser.

All shell execution must happen server-side.

---

# Core architecture

Create a small server-side Lutris adapter.

Example structure:

```text
src/
  app/
  api/
  components/
  lib/
    lutris/
      client.ts
      parser.ts
      types.ts
      normalizer.ts
```

The Lutris layer should:

1. execute the Lutris CLI
2. parse JSON output
3. parse nested `details` JSON when possible
4. normalize differences between Steam/Epic/GOG/Amazon
5. expose strongly typed objects to the rest of the app
6. handle malformed data gracefully

Never expose arbitrary shell execution through an API.

Do not accept shell commands from client input.

The exact Lutris command should be hardcoded or selected from a predefined safe set.

---

# Normalized game model

Create an internal model roughly like:

```ts
type GameService =
  | "steam"
  | "egs"
  | "gog"
  | "amazon"
  | "other";

interface LibraryGame {
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

  playtimeMinutes?: number;

  nativeLinuxSupport?: boolean | null;

  description?: string;

  rawDetails?: unknown;
}
```

Keep `rawDetails` so I can inspect the original provider data when debugging.

---

# Service parsing

Different stores return different metadata.

Handle them separately when needed.

## Steam

Try to extract:

- appid
- playtime_forever
- icon
- playtime
- stats availability
- name

Convert Steam playtime into:

- minutes
- human-readable hours

Example:

```text
9625 minutes
=> 160.4 hours
```

## Epic

Try to extract:

- title
- developer
- keyImages
- acquisitionDate
- product ID
- DLC metadata
- supported platforms
- description

Prefer a tall game cover if available.

## GOG

Try to extract:

- title
- cover/image
- release date
- category
- rating
- Linux/Windows/Mac support
- DLC count

## Amazon

Try to extract:

- title
- developer
- publisher
- cover
- genres
- release date
- game modes

The parser must never crash just because one provider's schema changes.

---

# Main UI

Create a polished dark gaming-library interface.

Think:

- Steam library
- Playnite
- GOG Galaxy
- Heroic

but simpler and cleaner.

## Main page

Header:

```text
My Game Library
668 games
```

Show summary stats such as:

```text
Total Games
Installed
Steam
Epic
GOG
Amazon
```

If possible, calculate counts dynamically.

Example:

```text
668 Total
426 Epic
104 Steam
95 GOG
43 Amazon
```

Do not hardcode these values.

---

# Game grid

Default view should be a responsive cover-art grid.

Each card should show:

- cover
- title
- store/service badge
- installed indicator
- playtime if available

Example:

```text
ELDEN RING

Steam
Installed

160.4 hrs
```

Cards should have tasteful hover interactions.

---

# List view

Allow switching between:

```text
Grid
List
```

List view columns:

```text
Game
Service
Installed
Playtime
Release Date
Developer
```

Make columns sortable.

---

# Search

Provide instant client-side search by:

- game name
- developer
- publisher

Search should be fuzzy enough that:

```text
tomb raid
```

finds:

```text
Tomb Raider
Rise of the Tomb Raider
Shadow of the Tomb Raider
```

---

# Filters

Add filters for:

## Service

- All
- Steam
- Epic
- GOG
- Amazon

## Installation

- All
- Installed
- Not Installed

## Playtime

- Any
- Never Played
- < 2 hours
- 2–10 hours
- 10–50 hours
- 50–100 hours
- 100+ hours

Only show playtime filtering when data exists.

## Linux support

When metadata provides it:

- Native Linux
- Windows only
- Unknown

Do NOT guess Proton compatibility yet.

---

# Sorting

Allow:

- Name A-Z
- Name Z-A
- Most Played
- Least Played
- Recently Released
- Oldest
- Installed First
- Service

---

# Game details page / modal

Clicking a game should show:

- large cover
- title
- service
- installation status
- developer
- publisher
- release date
- genres
- playtime
- Linux support
- description

Also include a collapsible:

```text
Advanced / Raw Metadata
```

that pretty-prints the normalized object and optionally the original Lutris metadata.

This will be useful while developing parsers.

---

# Franchise grouping

Implement simple franchise discovery based primarily on title similarity.

Example:

```text
Tomb Raider
```

should allow me to see titles such as:

- Tomb Raider
- Rise of the Tomb Raider
- Shadow of the Tomb Raider
- Tomb Raider Anniversary
- Tomb Raider Underworld
- Tomb Raider I-III Remastered
- Tomb Raider IV-VI Remastered

Do not rely on this grouping for critical logic because title matching is imperfect.

Treat it as a convenience feature.

---

# Duplicate detection

A major feature should be detecting games owned on more than one platform.

For example:

```text
Tomb Raider
Steam
Epic
GOG
```

Group obvious duplicates together.

Use normalized title matching.

Normalization can remove:

- ™
- ®
- punctuation
- edition suffixes where appropriate
- case differences

But be conservative.

For example:

```text
Mafia II
Mafia II: Definitive Edition
```

should NOT automatically be considered identical versions without showing that distinction.

Create:

```ts
normalizeGameTitle()
```

and keep the matching logic isolated and testable.

Show a badge such as:

```text
Owned on 3 platforms
```

---

# Stats page

Create a `/stats` page.

Useful stats:

- total library entries
- estimated unique games after duplicate grouping
- games by platform
- installed games
- uninstalled games
- games with recorded playtime
- never-played Steam games
- total Steam playtime
- top 10 most played games
- franchise counts
- duplicates across stores

Example visualization:

```text
Library by Platform

Epic    ███████████████████ 426
Steam   █████ 104
GOG     ████ 95
Amazon  ██ 43
```

Use lightweight charts only if they improve readability.

---

# Backlog view

Create a `/backlog` page.

Initially define backlog as:

```text
owned && not currently installed
```

with optional Steam playtime filtering.

Provide filters like:

```text
Never played
<2 hours
Installed
Not installed
```

This does NOT need cloud saves or achievement integration.

---

# Refresh

Add a:

```text
Refresh Library
```

button.

It should rerun:

```bash
lutris --list-all-service-games --json
```

and update the UI.

Show:

- loading state
- last refreshed timestamp
- useful error message if Lutris isn't available

Do not repeatedly execute Lutris CLI during ordinary browsing.

Cache the parsed result in memory or a local cache file.

A reasonable strategy:

```text
data/library-cache.json
```

On startup:

1. load cache if present
2. optionally refresh from Lutris
3. allow manual refresh

---

# API

Possible API routes:

```text
GET /api/library
POST /api/library/refresh
GET /api/stats
```

`GET /api/library` should return normalized data.

`POST /api/library/refresh` should explicitly rerun the Lutris CLI.

Do not expose the raw command runner.

---

# Error handling

Handle:

### Lutris isn't installed

Show:

```text
Lutris could not be found.

Make sure `lutris` is installed and available in PATH.
```

### Lutris command fails

Return:

- exit code
- safe stderr summary

Do not expose unrelated sensitive environment variables.

### One provider fails

If Lutris still returns partial data, display what is available.

### Invalid nested JSON

Keep the entry and store the original details string.

Never drop the whole library because one game has malformed metadata.

---

# Security

This app is intended for localhost only.

Still follow these rules:

- never execute client-provided shell commands
- never use `eval`
- never interpolate user input into shell commands
- prefer `execFile` / `spawn` with argument arrays instead of `exec`
- do not expose arbitrary filesystem browsing
- do not expose environment variables

Example:

```ts
spawn("lutris", ["--list-all-service-games", "--json"])
```

is preferred over:

```ts
exec(`lutris ${userInput}`)
```

---

# Performance

My library can contain 600+ entries.

Design for at least:

```text
5,000 games
```

without the UI becoming sluggish.

Use:

- memoized filtering
- efficient search
- lazy-loaded images
- pagination or virtualization only if actually needed

Do not prematurely overengineer.

---

# Nice-to-have features

After the core version is working, add:

## Wishlist

Allow me to locally mark games as:

```text
Wishlist
Interested
Playing
Completed
Dropped
```

Store this metadata in a local JSON file.
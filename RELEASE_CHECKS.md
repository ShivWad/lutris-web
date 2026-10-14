# Release verification — 2026-10-14

This report covers the initial 0.1.0 source tree. It does not publish a release or establish compatibility with every Lutris/provider version.

## Behavior and documentation

- Refresh imports records already cached by Lutris. New purchases require **Reload** in the Lutris desktop app before refreshing the web library. Rebuild recreates the web index from the same configured source.
- Docker supports manual JSON imports and an optional Linux user-service helper over a restricted Unix socket. The helper executes only the fixed Lutris listing command; the Epic live-sync experiment has been removed. There is no storefront API client or token-renewal code.
- Steam, Epic Games, GOG, Amazon Games, Ubisoft Connect, and EA app have labels, filters, and service statistics. Unknown services remain browsable.
- Desktop browsing has a two-row toolbar, readable two-line titles, larger controls, visible refresh feedback, keyboard selection, and locale-safe refresh timestamps. Mobile navigation and the details dialog retain keyboard support.
- Real playtime is normalized from Steam records when present. The tested Epic and GOG service exports contain no playtime fields; Lutris's separate local-game hours are not merged. Unknown values currently enter the Never played and Under 2 hours backlog filters. Demo metadata is synthetic.
- Invalid imports preserve the last successful index. Refreshes replace data transactionally; rebuilds prepare a separate database before replacement. Concurrent updates are rejected within one server process.
- README, contribution guidance, security policy, product/design notes, issue templates, and font notices describe the current behavior and limits. Self-hosted fonts include their original SIL Open Font License texts.
- The public-tree guard rejects an empty Git index and known private paths, including cloud configuration. Tests cover initial staging and private-file rejection. This guard is not a general secret scanner or a history audit.
- Standalone and Docker packaging include the project license, third-party notices, and installed dependency license files, including bundled Next.js notices. Smoke tests compare the main runtime licenses with their installed originals.
- CI actions are pinned to verified upstream commit hashes; Dependabot tracks action updates. An unreleased changelog describes the initial public source release.
- The architecture guide maps the data flow, modules, API, indexing/recovery contracts, and extension workflow. Inline comments explain units, missing metadata, grouping identity, query semantics, stale-response handling, hydration, and security boundaries.
- Playtime filters now split at 3,000 minutes (50 hours), with a regression test covering adjacent bands.
- An original brass-and-graphite app icon is included with its generation prompt, a 48px browser icon, and a 180px Apple touch icon. Next.js discovers the icon files through its metadata convention.

## Verification

Local checks use Node.js 24.12.0 and pnpm 10.17.1. Automated tests use temporary synthetic data and do not synchronize store accounts or change the desktop library.

The final CI sequence was repeated from a fresh copy exported only from Git's index, with no personal export, database, dependencies, or build cache copied in. Frozen installation, public-tree checks, lint, tests, type checking, build, and both HTTP smoke modes passed there.

| Check | Result |
| --- | --- |
| Frozen-lockfile install | Passed |
| Unit/integration suite | 65 tests passed |
| ESLint | Passed |
| TypeScript and route types | Passed |
| Production build | Passed from a clean staged-source copy and again after adding app icons |
| Production HTTP smoke tests | Passed in file-import and host-helper modes |
| Base and host-override Compose configuration | Passed |
| Docker image build | Passed during the open-source packaging pass; running app left unchanged |
| Docker artifact inspection | Passed: non-root user, project/font/runtime license notices present, no personal export |
| App icon metadata and routes | Passed: browser and Apple touch links, PNG responses, 48px/180px dimensions |
| Public-tree and staged whitespace checks | Passed for the staged initial source tree |
| Dependency audit | One unresolved high-severity advisory in lint tooling; see below |

During the preceding UI/integration pass, Chromium checks covered desktop/mobile navigation, filtering, refresh feedback, the details dialog, horizontal overflow, and hydration errors. The running host helper was checked with the fixed CLI export after removing live sync. These manual checks are not committed browser automation and do not establish support for every provider schema.

## Dependency audit

The lockfile overrides `source-map-js` to the published fixed 1.2.2 release for [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).

The 2026-10-14 registry audit still reports [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm): deeply nested patterns can exhaust the stack in `braces` 3.0.3. No patched version is available. The reported chain is `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`, through development lint tooling. The audit is not clean; review a fixed upstream release before publication and avoid feeding untrusted patterns into affected tooling.

## Publication and deployment limits

- The initial source is prepared for [ShivWad/lutris-web](https://github.com/ShivWad/lutris-web). GitHub repository settings, including private vulnerability reporting and branch protection, must be configured separately from source files.
- Keep personal exports, databases, environment files, credentials, logs, and diagnostic captures out of Git. Review the staged diff before committing; a successful path check alone does not establish that all content is safe to publish.
- The host helper runs with the desktop user's file access. Docker isolation applies to the web container, not this unsandboxed user service. Its socket permissions and fixed command restrict its request interface.
- Run one application instance per database path. This local application has no authentication; the supplied web bindings are localhost-only.
- Provider metadata remains schema-dependent. Refresh cannot manufacture fields absent from Lutris's cached export.

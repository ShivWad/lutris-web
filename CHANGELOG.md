# Changelog

## 0.1.0 — Unreleased

Initial public source release of My Game Library.

- Browse Lutris's cached service library with search, filters, grid/list views, edition-aware duplicate groups, and a provider metadata ledger.
- Explore backlog, library statistics, and Sale Check without installing, launching, or modifying games.
- Import through the local Lutris CLI, a manual JSON export, or an optional Linux export-only helper for Docker.
- Persist the index in SQLite and preserve the last successful import when a refresh fails.
- Include synthetic demo mode, localhost-only Docker Compose, contribution guidance, security policy, automated checks, and third-party notices.
- Document architecture and maintenance contracts, and preserve dependency license notices in production packages.
- Include an original brass-and-graphite app icon with browser and Apple touch variants.
- Align the 10–50 and 50–100 hour filters with the 3,000-minute boundary.

Provider metadata is incomplete by design: the tested Epic and GOG exports do not include playtime. New purchases must load in Lutris before a web refresh. See [README.md](README.md) and [RELEASE_CHECKS.md](RELEASE_CHECKS.md) for setup, verification, and known limitations.

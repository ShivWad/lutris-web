# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js, TypeScript, React, Tailwind CSS, and Node.js server-side APIs. SQLite provides the local index; no external database service is required.

## Users

Linux PC gamers who connect multiple game services to Lutris and want one fast, searchable view of everything they own.

## Product Purpose

Provide a polished local-first browser for the user's Lutris library: browse, search, filter, compare duplicates, inspect normalized provider metadata, understand a backlog, and review library statistics. Success means the owner can answer “what do I own, where do I own it, and what should I play?” without switching storefronts.

## Positioning

The app is a safe, read-only web interface over the local Lutris CLI. It unifies multiple connected services while retaining the raw provider records that explain every normalized field.

## Operating Context

The app runs locally through Node.js or Docker Compose. Its source of truth is Lutris's cached service library, exported with `lutris --list-all-service-games --json`. Local Node.js mode has `lutris -a -j` as a compatibility fallback. Docker reads a manual export or uses an optional Linux user service over a permission-restricted Unix socket to request the fixed listing command on the host. New purchases must first load in the Lutris desktop app. People browse routinely from a desktop browser, refresh deliberately, and inspect raw metadata when provider parsing needs diagnosis.

## Capabilities and Constraints

- Read and normalize Steam, Epic, GOG, Amazon, Ubisoft Connect, EA app, and unknown-service entries.
- Browse in grid and sortable list views; search names, developers, and publishers; filter service, installation, playtime, and Linux support.
- Surface conservative duplicate groups, title-similarity franchise suggestions, stats, and a backlog defined initially as owned but not installed.
- Deduplicate equivalent store entries into one edition-aware library item, while keeping materially distinct editions separate.
- Provide a Sale Check workflow that identifies owned titles, stores, editions, and DLC before a purchase.
- Execute only hardcoded Lutris commands on the server. Never accept shell commands from the browser.
- V1 must not install, uninstall, launch, modify, or delete games.
- Read the local index at startup and import source updates only by explicit user action.
- Import real playtime from Steam metadata when available. Epic and GOG service records on the tested installation do not include playtime; do not invent launcher totals or add storefront API calls.
- Provider schema changes and malformed nested JSON must degrade gracefully rather than crashing the library.
- Provide localhost-only Docker Compose packaging with a persistent SQLite volume and optional export-only host helper.

## Brand Commitments

The product name is “My Game Library.” The experience should be a polished dark gaming-library interface: simpler and cleaner than the broad feature sets of Steam, Playnite, GOG Galaxy, and Heroic.

## Evidence on Hand

The original product brief and sample Lutris object live in `Lutris Library Browser Web App.md`; implemented behavior and setup are documented in README.md. Generated demo artwork and provider identity assets are included. Synthetic demo content must be labeled, and personal exports, databases, tokens, and diagnostic screenshots must not be published.

## Product Principles

- Read-only by construction.
- Local data stays local.
- Browsing is immediate; refresh is deliberate.
- Normalized fields remain traceable to raw provider metadata.
- Conservative grouping is preferable to confident false matches.

## Accessibility & Inclusion

Keyboard access, visible focus, semantic controls, reduced-motion support, responsive layouts, and WCAG AA text contrast are required.

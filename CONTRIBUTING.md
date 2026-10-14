# Contributing

Thanks for helping improve My Game Library.

## Before you begin

- Follow the [Code of Conduct](CODE_OF_CONDUCT.md).
- Search existing issues before opening a new one.
- Keep changes focused. Discuss large features or schema changes in an issue first.
- Never attach or commit personal Lutris exports, SQLite databases, tokens, or unredacted raw metadata.

## Development setup

Requires Node.js 24+ and pnpm 10.17.1.

```bash
git clone https://github.com/ShivWad/lutris-web.git
cd lutris-web
pnpm install
LUTRIS_DEMO=1 pnpm dev
```

Demo mode is preferred for UI work and issue reproduction. It uses an in-memory database and clearly labeled illustrative records.

For provider parsing work, create the smallest synthetic fixture that reproduces the schema. Remove account identifiers and credentials. Do not commit a real library export.

Read [ARCHITECTURE.md](ARCHITECTURE.md) before changing imports, grouping, persistence, or request state. Keep comments focused on invariants, units, trust boundaries, and non-obvious failure behavior. Update architecture and operation docs when their contracts change.

## Quality checks

Run before submitting:

```bash
pnpm check:public
pnpm lint
pnpm test
pnpm typecheck
pnpm build
pnpm test:smoke
```

Add or update tests for normalization, matching, querying, or pagination changes. UI changes should be checked at desktop and mobile widths with keyboard focus visible.

The public-tree check reads Git's index, so stage intended source files before running it in a new checkout. Review `git diff --cached` before committing. Databases, exports, environment files, cloud credentials, and local agent state must stay out of the index.

Keep dependency and asset licenses intact. `pnpm build` packages installed dependency notices with the standalone output; production smoke tests verify that the project and main runtime dependency licenses survive packaging. GitHub Actions are pinned to verified commit hashes and updated through Dependabot.

Provider fixtures must reflect fields actually exported by Lutris. Unknown playtime must not be presented as an account-wide launcher total. Store synchronization belongs to Lutris; the web app and optional host helper only import cached records. Helper tests use a synthetic CLI executable and socket, not a live storefront account.

## Pull requests

- Explain the problem and why the chosen approach fits the read-only, local-first model.
- Link related issues.
- Include screenshots for visible changes, using demo data only.
- Call out provider-schema assumptions and fallback behavior.
- Update documentation when commands, configuration, or behavior changes.

By contributing, you agree that your contribution is licensed under the repository's MIT License.

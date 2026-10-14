# Security Policy

## Supported versions

Security fixes target the latest code on the default branch. Until stable releases are published, older snapshots are not supported.

## Report a vulnerability

Use GitHub's **Security → Report a vulnerability** flow to submit a private report. Do not open a public issue for command execution, path traversal, data exposure, request forgery, dependency compromise, or another exploitable weakness.

Repository maintainers must enable private vulnerability reporting before publication. If that option is unavailable, contact a maintainer through a private channel listed on their GitHub profile; do not post sensitive reproduction details publicly.

Include the affected revision, environment, reproduction steps, impact, and any suggested mitigation. Remove library contents, account identifiers, tokens, and other private data. Maintainers will acknowledge a complete report, investigate it, and coordinate disclosure after a fix is available.

## Deployment boundary

My Game Library is a local tool with no authentication. Local development, production start, and Docker Compose bind to `127.0.0.1`. Do not expose the service directly to an untrusted network. If remote access is required, place it behind an authenticated reverse proxy and appropriate transport security. Preserve the original `Host` header when proxying requests.

The refresh and rebuild APIs execute only hardcoded Lutris commands or read the server-configured import path. Browser input must never become a command or filesystem path. Browser writes are checked using `Origin` and Fetch Metadata headers; local CLI requests without those headers remain supported. This protection is not authentication.

Invalid exports leave the existing index intact. Rebuild constructs the replacement before replacing the configured SQLite index. Only one refresh or rebuild runs at a time in a server process; run one application instance per database path.

The optional Linux host helper runs as your desktop user and exposes only `POST /refresh` on an owner/group-accessible Unix socket, with no network listener. It executes only the fixed `lutris --list-all-service-games --json` command without a shell. The helper has no storefront API client or token-handling code; it reads Lutris's cached game records and leaves account synchronization to the Lutris desktop app. No commands, paths, account IDs or credentials are accepted from requests. Request bodies and browser-originated requests are rejected, execution time and output size are bounded, and command errors are reduced to fixed public messages. The container mounts only the helper socket directory read-only; it receives no Docker socket or host executable mounts. Treat members of the helper socket's group as trusted to request library exports. Failures preserve the index and never fall back silently to an older file import.

The user service is not a filesystem sandbox. It inherits its desktop user's access to files and credentials, so its source and installed dependencies must be trusted. Docker's read-only filesystem and non-root user apply to the web container, not the host helper. Manual export mode avoids the persistent helper.

The public-tree check rejects known sensitive paths in Git's index. It does not scan repository history or guarantee that arbitrary source files contain no secrets. Review the complete staged diff before an initial publication.

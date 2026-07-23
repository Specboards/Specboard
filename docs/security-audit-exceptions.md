# Dependency audit exceptions

The CI audit gate (`pnpm run audit`, run in `ci.yml` and on a schedule in
`security-audit.yml`) fails the build on a high or critical advisory in a
production dependency. An advisory we have reviewed and accepted is suppressed
by its GHSA id in `package.json` under `pnpm.auditConfig.ignoreGhsas`.

`package.json` cannot hold a rationale or an expiry, so every id listed there
must also appear below with why it is accepted and a date to revisit it. An
exception past its review-by date should be re-evaluated, not renewed by habit.

## Accepted exceptions

### GHSA-frvp-7c67-39w9 — `@hono/node-server` serve-static path traversal

- **Severity:** moderate (below the high/critical gate, but recorded so a full
  audit stays clean and the acceptance is explicit).
- **Why accepted:** the vulnerability is a Windows-only path traversal in
  `serve-static` via an encoded backslash (`%5C`). Our deployment runs on Linux
  (Fly.io), where the code path is unreachable. The app also does not serve
  static files through this adapter; the dependency arrives transitively via
  `@modelcontextprotocol/sdk`.
- **Fix status:** the fix exists only in `@hono/node-server` 2.x, a major
  version the MCP SDK does not yet accept.
- **Review by:** 2026-10-01, or sooner if `@modelcontextprotocol/sdk` adopts
  `@hono/node-server` 2.x (drop the exception then and take the upgrade).

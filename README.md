# Specboard

A lightweight, spec-based product-management layer for **spec-driven development**.

Your specs stay canonical in git (versioned with code, read by AI coding agents).
Specboard layers the product metadata **on top** of them: status, assignment,
backlog order, releases, custom properties, a rich-text details body,
dependencies, and epic/sub-feature hierarchy. PM, UX, and engineering
collaborate without editing files in a terminal and without duplicating work
into JIRA/Aha.

Open-core: self-host the core for free, or use the hosted SaaS.

- **Design:** [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- **Backlog:** [`docs/BACKLOG.md`](./docs/BACKLOG.md) (tracked in Specboard)
- **Original build plan:** [`docs/archive/PLAN.md`](./docs/archive/PLAN.md)

> Status: **active build**. Working: the web UI (Backlog · Board · Roadmap ·
> Ideas · Feature detail with dependencies/relations), multi-product backlogs,
> releases, custom card properties, spec parsing, status workflow, DB
> schema/seed, outbound webhooks, auth (sign-up/in, email verification, password
> reset, account/settings), GitHub sync (one-click App setup, repo
> connect/picker, push reconcile), and an MCP server for coding agents (hosted
> OAuth 2.1 endpoint + a local stdio server) through which agents read, update,
> and edit specs. Still stubbed: editing spec content from the app UI (agents do
> this over MCP, which commits to git).

## Layout

```
apps/
  web/        Next.js App Router UI + the hosted MCP endpoint (/api/mcp, OAuth 2.1)
  mcp/        Standalone stdio MCP server (self-host / offline agent access)
  cli/        `specboard` CLI over the /api/v1 surface (API-key auth)
packages/
  core/       Spec parsing, status state machine, .specboard/config.yml schema
  db/         Drizzle schema + Postgres client (metadata + spec index)
  git/        GitHub App client, spec reader/writer, webhook reconciler
  ui/         Shared design tokens / components
infra/
  docker-compose.yml   Self-host stack (web + Postgres)
  migrations/          Drizzle migrations (tables, auth, RLS policies)
  web.Dockerfile       Web app image (self-host + Fly.io SaaS)
```

## Repo conventions for specs

Specs are **work items** (the spec-backed leaf of the hierarchy). They live under
`specs/<feature>/spec.md` with YAML frontmatter:

```yaml
---
id: <uuid> # stable link to Specboard metadata (survives renames)
title: My Feature
kind: feature
feature: checkout # optional: groups this spec under a named Feature (else its folder is used)
---
```

On import each spec is homed under a **Feature** grouping, by its `feature:` value
when set, otherwise by its folder (specs in the same directory share a Feature). The
hierarchy above the leaf (Feature → Epic → Initiative) is managed in the app, not git.

Per-repo config (which globs are specs, status workflow, write mode) lives in
[`.specboard/config.yml`](./.specboard/config.yml). Custom card properties are
admin-defined in the app (Settings → Cards), not in the repo config.

## Local testing: quick start

Requires Node 22+ and pnpm 10+. No database needed:

```bash
pnpm install
pnpm build
pnpm --filter @specboard/web dev   # http://localhost:3000
```

Without `DATABASE_URL`, the app runs in **local file mode**: it reads
`specs/**/spec.md` straight from this repo and persists PM metadata (status,
assignee, tags, release, details) to `.specboard/local-metadata.json` (plus
sibling `local-*.json` files for items, releases, properties, and templates).
The committed file pre-populates the boards with this repo's own specs; edit
freely and `git checkout .specboard/local-metadata.json` to reset.

### With Postgres (the real deployment shape)

```bash
pnpm db:up        # docker compose Postgres on :5432 (or bring your own)
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/specboard
pnpm db:migrate   # apply infra/migrations
pnpm db:seed      # import specs/** into features + spec_index
pnpm --filter @specboard/web dev
```

The UI is identical; metadata now lives in `features` rows, matching the
architecture's system-of-record split.

### MCP server (agents)

Specboard speaks the Model Context Protocol so coding agents (Claude Code and
others) can read and drive the backlog. Two ways to connect:

**Hosted endpoint (recommended).** Every deployment serves an authenticated MCP
endpoint at `POST /api/mcp` (e.g. `https://app.specboard.ai/api/mcp`) with OAuth
2.1 sign-in, or an `x-api-key` for service accounts. Point your client at it and
approve the browser consent screen; the connection binds to your user and the
workspace you pick. Tools: `whoami`, `list_products`, `list_items`, `read_item`,
`get_relations`, `create_item`, `update_item`, `delete_item`,
`update_spec_content` and `create_spec` (both commit to git), and
`list_releases` / `create_release`.

**Local stdio server (self-host / offline).** A stdio MCP server is also bundled:

```bash
pnpm --filter @specboard/mcp build
DATABASE_URL=postgres://... node apps/mcp/dist/server.js
```

It exposes a read/update subset (list, read, relations, status) over stdio
against the seeded Postgres above.

## Develop

```bash
pnpm build          # turbo: builds all packages/apps
pnpm test           # runs unit tests (e.g. the spec parser in packages/core)
pnpm typecheck
```

### Database

```bash
pnpm --filter @specboard/db generate   # emit table migrations into infra/migrations
pnpm db:migrate                         # apply against $DATABASE_URL (incl. RLS policies)
```

### Self-host

```bash
docker compose -f infra/docker-compose.yml up   # web (infra/web.Dockerfile) + Postgres
```

## License

Specboard is **open-core**. The core product, which includes the web app,
shared packages, MCP server, and single-org (`N=1`) self-hosting, is licensed
under the [Apache License 2.0](./LICENSE). You may run, modify, and self-host it
for any purpose, including commercially.

A small set of SaaS-oriented features are licensed separately: multi-tenant
hosting (`N>1`), SSO/SAML/SCIM, advanced analytics, premium integrations, and
audit logs. See [LICENSING.md](./LICENSING.md) for the full breakdown, or contact
**contact@palouse.io** for a commercial license.

The Specboard **brand** (name, logos, visual identity) and the marketing site
are **not** open source. They live in the separate
[Website](https://github.com/Specboards/Website) repo under a proprietary
license. Apache-2.0 does not grant trademark rights; see
[LICENSING.md](./LICENSING.md#brand-and-trademarks-all-rights-reserved).

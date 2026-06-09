# SpecBoard — Architecture

SpecBoard is a lightweight, spec-based product-management layer for teams doing
**spec-driven development**. Specs live as markdown in your git repo (canonical,
versioned with code, read by AI coding agents). SpecBoard layers the _product_
metadata — status, assignment, priority, backlog order, roadmap — **on top** of
those specs so PM, UX, and engineering can collaborate without editing files in a
terminal and without duplicating work into a separate tracker.

Think of it as a spec-native, lightweight ProductBoard / JIRA / Aha!.

## Why not just use spec-board / Spec Kit / JIRA?

- **spec-board** centralizes specs in Postgres, giving up git as the source of truth.
- **GitHub Spec Kit** is git-native but CLI-only — no PM layer, no metadata, no UI for PM/UX.
- **JIRA / Aha / ProductBoard** are heavyweight and disconnected from the actual specs,
  forcing duplicate authoring and brittle syncs.

SpecBoard keeps **spec content in git** and **metadata in a database**, joined by a
stable spec id.

## System of record

| Data                                                       | Home         | Why                                                                           |
| ---------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------- |
| Spec content (`spec.md`, `plan.md`, `tasks.md`)            | **Git**      | Diff-able, versioned with code, read by agents                                |
| Metadata (status, assignee, priority, rank, tags, roadmap) | **Database** | Queryable, real-time, access-controlled; no spec-file thrash on a status flip |
| Spec index (content cache + git path/sha)                  | **Database** | Fast boards/search without hitting git on every render                        |

### Spec identity — the linchpin

Each spec carries a stable `id` (UUID) in YAML frontmatter. The DB `features` row is
keyed by `(repo_id, spec_id)`, **not** by path — so renames/moves never orphan
metadata. On first import of a spec without an `id`, the git service injects one via a
single commit (`packages/git` → `injectSpecId`). Path + blob `sha` are cached in
`spec_index` for fast lookup and drift/conflict detection.

## Components

```
GitHub repo (specs/**, .specboard/config.yml)
   ▲ commits/PRs        │ webhooks + reads
   │                    ▼
Git Integration Service (GitHub App)  ── packages/git
   reads/parses specs · injects ids · reconciles on push · writes edits back
   │                                   ▲
   ▼ content + sha (index)             │ specs + metadata
Postgres / Supabase  ── packages/db    │
   metadata (system of record) + spec index + RLS multi-tenancy
   ▲                                   │
   │                                   │
Next.js web app  ── apps/web           MCP server ── apps/mcp
   Backlog · Board · Roadmap ·         list_features · read_spec ·
   Feature detail (spec + metadata)    update_status  (to coding agents)
```

- **`packages/core`** — framework-agnostic domain logic: spec frontmatter + markdown
  parser (`parseSpec`), status state machine (`canTransition`), `.specboard/config.yml`
  schema (`parseRepoConfig`). Unit-tested.
- **`packages/db`** — Drizzle schema (`workspaces`, `members`, `repositories`,
  `features`, `spec_index`, `comments`, `activity_log`) + Postgres client. RLS policies
  in `infra/supabase/migrations`.
- **`packages/git`** — GitHub App client + reconciler (`reconcileSpecs`), webhook
  verification/affected-spec resolution. _(GitHub calls stubbed in scaffold.)_
- **`packages/ui`** — shared design tokens / components.
- **`apps/web`** — Next.js App Router UI; Supabase auth; routes for Backlog, Board,
  Roadmap, Feature detail.
- **`apps/mcp`** — MCP server exposing prioritized, status-aware specs to agents.

## Key flows

1. **Connect repo** — install GitHub App → scan `specs/**` per `.specboard/config.yml`
   → create `features` + `spec_index`, injecting missing `id`s.
2. **Reconcile on push** — webhook → re-parse changed specs → update `spec_index`;
   `blob_sha` detects drift/conflicts.
3. **Edit spec in UI** — save → `packages/git` writes a commit or opens a PR
   (`writeMode`) → webhook confirms → index updates.
4. **Edit metadata in UI** — writes straight to DB (no git churn), real-time to boards.
5. **Agent via MCP** — `list_features` / `read_spec` / `update_status`: agents act on
   prioritized, assigned, status-aware specs.

## Multi-tenancy

`workspace` is the tenant root; every tenant row carries `workspace_id` and Postgres
**RLS** isolates tenants (`specboard_is_member(workspace_id)` via Supabase `auth.uid()`).
SaaS = many workspaces on shared infra; self-host = a single workspace.

## Open-core boundary

- **Open source (Apache-2.0):** spec editor, kanban/backlog/roadmap, GitHub git sync,
  MCP server, single-workspace self-host, docker-compose deploy.
- **Commercial (hosted SaaS):** multi-tenant hosting, SSO/SAML/SCIM, advanced
  analytics/insights, premium integrations (Jira/Linear/Slack), audit logs, support.

Commercial code stays in clearly separated, flag-gated modules so the OSS build is
fully functional standalone (no crippleware).

## Tech stack

Turborepo + pnpm workspaces · TypeScript · Next.js (App Router) · Drizzle ORM ·
Postgres / **Supabase** (Postgres + Auth + RLS) · `@modelcontextprotocol/sdk` ·
`octokit` (GitHub App).

## Deployment

- **Self-host:** `infra/docker-compose.yml` (web + Postgres).
- **SaaS:** Next.js on Vercel + Supabase; migrations in `infra/supabase/`.

## Local file mode (development/testing)

When `DATABASE_URL` is unset, `apps/web` swaps its store implementation
(`apps/web/src/lib/store`) for a filesystem-backed one: specs are read directly
from this repo's `specs/` directory and metadata persists to
`.specboard/local-metadata.json`. Same UI, zero infrastructure — useful for UI
testing and for dogfooding SpecBoard on its own specs. Postgres mode is the
deployment shape.

## Status

**Early build.** Working: web UI (Backlog · Board · Roadmap · Feature detail,
base shadcn styling), spec parser + status workflow (`packages/core`), Drizzle
schema/migrations/seed (`packages/db`), DB-backed MCP tools (`apps/mcp`), local
file mode. Still stubbed: GitHub App sync (`packages/git`), Supabase auth,
spec editing from the UI. See `docs/PLAN.md` for the build plan.

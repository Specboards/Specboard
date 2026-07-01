# Next steps: onboarding spec flow

Handoff for picking this up tomorrow. Branch: `feat/onboarding-spec-import-scan`.
Open PR: **#68** (https://github.com/Specboards/SpecBoard/pull/68). Not yet
merged or deployed. Repo version still 0.1.3.

## Where we are

Building the onboarding improvements as tracer-bullet slices (thin end-to-end
first, expand from there). Two slices are done and on PR #68, covering asks #1
and #3, plus the seeding half of #2.

### Done (PR #68, verified green: typecheck 11/11, build 7/7, tests 90)

- **Ask #1 - scan + import on confirm.** Connecting a repo from the picker now
  registers it WITHOUT auto-importing (new optional `sync` flag on
  `POST /api/v1/repositories`, default true; picker passes `sync: false`). An
  inline "Import your specs" panel on the Repositories page scans connected repos
  read-only (`GET /api/v1/repositories/scan`), lists the `spec.md` files, and
  creates cards only on confirm (`POST /api/v1/repositories/import`), then links
  to the board.
- **Ask #3 - guided first spec.** When connected repos have no specs, the empty
  state is a walkthrough: name a feature, pick a repo, and we commit a starter
  `specs/<feature>/spec.md` (stable id + template body) and import it, so a real
  card appears. Endpoint: `POST /api/v1/repositories/starter-spec`. Refuses to
  overwrite an existing file.

Key files: `packages/core/src/spec.ts` (`previewSpec`, unit-tested),
`apps/web/src/lib/github-sync.ts` (`scanRepositorySpecs`, `scanWorkspaceSpecs`,
`createStarterSpec`), the three new routes under
`apps/web/src/app/api/v1/repositories/`, `apps/web/src/lib/api-client.ts`, and
`apps/web/src/components/repositories-manager.tsx` (`SpecImportPanel`,
`EmptySpecsState`).

## Decisions (settled)

1. **Starter spec commit target: direct.** `createStarterSpec` keeps committing
   directly to the default branch (mode `"direct"`, consistent with how stable-id
   injection already commits). No PR mode.
2. **Scope for 0.1.4: finish #2 first,** then cut one release covering all three
   asks. (Shipped as a patch, 0.1.4, by Jon's call, even though VERSIONING.md
   would normally treat new features as a minor.)

## Remaining work

- **Ask #2 - "create a dedicated spec repo" nudge. DONE.** The seed mechanism
  (`createStarterSpec`) was already built and reused by #3. Added a
  `CreateSpecRepoNudge` (in `repositories-manager.tsx`): a collapsible that
  deep-links to GitHub's prefilled new-repo page (`github.com/new?name=specs`),
  then walks the user back through install -> connect -> first spec. Shown in the
  two "no suitable repo" moments: the connect section (nothing connected) and the
  empty-specs first-spec state. Uses existing `contents:write`, no GitHub App
  permission bump. Verified green (typecheck 11/11, build 7/7, tests pass).
- **Manual test on cloud test** (per cloud-test-first): merge #68 -> auto-deploys
  to test.specboard.ai -> try both paths: a repo with `specs/**/spec.md`
  (scan -> import) and a repo with none (create-first-spec).
- **Release:** when happy, bump to **0.1.4** (see VERSIONING.md): bump all 8
  package.json in lockstep, add a CHANGELOG entry, verify green, merge, tag
  `v0.1.4` on the merge commit, then dispatch the Fly production deploy.

## How to resume

All three asks (#1, #2, #3) are implemented on this branch and green. Next:

1. Merge #68 -> auto-deploys to test.specboard.ai.
2. Smoke-test on test: a repo with `specs/**/spec.md` (scan -> import), a repo
   with none (create-first-spec), and the "dedicated spec repo" nudge.
3. Run the 0.1.4 release steps (bump 8 package.json in lockstep, CHANGELOG entry,
   verify green, merge, tag `v0.1.4`, dispatch Fly prod deploy).
4. Re-run `pnpm -w build && pnpm -w typecheck && pnpm -w test` before any push
   (push only green branches).

## Related context (this session)

- PR #66 (v0.1.3, GitHub setup trailing-space fix + versioning) merged and
  deployed to prod. GitHub App Setup URL space also fixed in settings.
- PR #67 (tracer-bullets added to CLAUDE.md "Building philosophy") open, not
  merged.
- Working principle: build features as tracer bullets (thin end-to-end slice,
  feedback, expand). Ship to cloud test first. One lockstep monorepo version per
  release.

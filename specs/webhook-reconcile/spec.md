---
id: 9a2d6f3b-8e1c-4a7d-b5f0-3c8e2d914a66
title: Webhook Reconciliation
kind: feature
---

# Webhook Reconciliation

Keep the spec index in sync with git: on every push, re-parse changed specs
and refresh the cached content the boards render from.

## Problem

If the index drifts from git, the UI shows stale spec content and agents act
on outdated requirements. Git must stay the undisputed source of truth.

## Requirements

- Verify webhook signatures before processing.
- Resolve which specs a push affected from the commit file lists.
- Re-parse and upsert `spec_index` rows; detect conflicts via `blob_sha`.
- Tolerate replays and out-of-order deliveries.

## Out of Scope

- Bidirectional merge of concurrent UI + git edits (separate spec).

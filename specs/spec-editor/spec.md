---
id: 2e6a8d4c-9b3f-4e1a-a7c5-8f2b0d6e3a11
title: In-App Spec Editor
kind: feature
---

# In-App Spec Editor

Let PM and UX edit spec markdown from the feature page; saves are written back
to git as a commit or pull request per the repo's `writeMode`.

## Problem

PM and UX own feature definition but don't want to edit markdown through a
terminal and git CLI; today they ask engineers to make spec changes for them.

## Requirements

- Markdown editor with preview on the feature detail page.
- Save honors `writeMode`: open a PR (default) or commit direct to branch.
- Detect concurrent git changes via `blob_sha` before writing.

## Out of Scope

- Real-time collaborative editing.

---
id: 5b8f2c7d-1a4e-4f9b-8c3d-6e0a9b5d2f88
title: MCP Agent Tools
kind: feature
---

# MCP Agent Tools

Expose specs plus their PM metadata to coding agents over MCP, so agents work
from the prioritized, status-aware backlog rather than raw files.

## Problem

Agents reading specs straight from the filesystem can't tell what is ready to
build, what is highest priority, or what is already done.

## Requirements

- `list_features`: metadata-filterable listing (status, assignee, tag).
- `read_spec`: full markdown plus current metadata for one spec.
- `update_status`: workflow-validated transitions only.

## Out of Scope

- Agent-initiated spec authoring.

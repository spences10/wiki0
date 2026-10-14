---
title: Landing page and local UI
type: decision
status: proposed
supersedes: [wiki/decisions/0005-web-app-opens-local-folders.md]
date: 2026-10-14
---

# Landing page and local UI

## Proposal

- `apps/wiki0-web` becomes the public landing page for wiki0.app.
- A separate local Svelte app, launched from the CLI, shows the index
  for a project: search with citations, the link graph, lint findings
  and superseded docs. It reads through `@wiki0/core` only.

## Open

Package name and how the CLI launches it are not decided. This follows
the core rework, so nothing here is built yet.

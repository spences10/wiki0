---
title: Local-first storage
status: accepted
tags:
  - decision
  - storage
  - local-first
---

# Local-first storage

Status: accepted

wiki0 should treat Markdown as the source of truth and SQLite as a
rebuildable local index/cache.

## Rationale

- Markdown is portable, diffable, and user-editable.
- SQLite gives agents fast FTS, backlinks, and graph queries.
- Git or cloud-folder sync can move the wiki between machines before
  hosted mode exists.

## Web app implication

The local web UI follows the same storage model. `wiki0 serve [root]`
receives a Markdown wiki root, not a database path, as the normal user
entry point. The SQLite database powers fast reads and analysis, but
Markdown remains canonical.

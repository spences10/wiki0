---
title: Index in the user cache
type: decision
status: accepted
supersedes: [wiki/decisions/0002-index-in-project-folder.md]
date: 2026-10-14
---

# Index in the user cache

## Decision

By default the index lives in the user cache, keyed per worktree:
`~/.cache/wiki0/<folder>-<hash>/index.db`. Nothing is written to the
project. A project can opt into `.wiki0/index.db` with `wiki0.toml`.
Details: [Storage](../reference/storage.md).

## Why

- wiki0 has to work on repos it does not own without adding files or
  editing `.gitignore`.
- The index is a rebuildable cache, which is what the cache directory
  is for.
- Keying by worktree keeps branches in separate worktrees from sharing
  an index of different files.

## Consequences

- The index is invisible, so `wiki0 status` prints its path.
- The CLI and an MCP server can run with different environments and
  resolve different paths; `WIKI0_INDEX` pins one file for both.
- Moving a repo leaves its old index behind in the cache.

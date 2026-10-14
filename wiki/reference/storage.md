---
title: Storage
type: reference
aliases: [index location, configuration]
---

# Storage

Code: `packages/core/src/storage.ts`, `config.ts`. Why the cache:
[0006](../decisions/0006-index-in-user-cache.md).

## Project root

The nearest folder, walking up from `--root` (default: the current
folder), that holds `wiki0.toml` or `.git`. A `.git` file, as in a git
worktree, counts.

## Index location

In order:

1. `WIKI0_INDEX`: an exact file path.
2. `[index] location = "local"` in `wiki0.toml`: `.wiki0/index.db` in
   the project, with a `.wiki0/.gitignore` so the project's own
   `.gitignore` is not touched.
3. The cache: `~/.cache/wiki0/<folder>-<hash>/index.db` on Linux
   (`XDG_CACHE_HOME` respected), `~/Library/Caches/wiki0/` on macOS,
   `%LOCALAPPDATA%\wiki0\Cache\` on Windows. `WIKI0_CACHE_DIR`
   replaces the base folder.

The hash is of the worktree's real path. `wiki0 status` prints the
path in use.

## Config

`wiki0.toml` at the project root, all keys optional:

```toml
include = ["docs/**/*.md"]
exclude = ["docs/archive/**"]

[index]
location = "cache" # or "local"
```

Patterns that are absolute or contain `..` are rejected, so committed
config cannot reach outside the project.

## Schema changes

The schema version is stored in the index. A mismatch makes reads
report the index as unusable and makes the next `wiki0 index` delete
and rebuild it.

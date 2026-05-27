# Local-first storage

Status: proposed

wiki0 should treat Markdown as the source of truth and SQLite as a
rebuildable local index/cache.

## Rationale

- Markdown is portable, diffable, and user-editable.
- SQLite gives agents fast FTS, backlinks, and graph queries.
- Git or cloud-folder sync can move the wiki between machines before
  hosted mode exists.

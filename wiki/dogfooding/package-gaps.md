---
title: Package gaps
aliases:
  - core cli mcp gaps
  - wiki0 package backlog
tags:
  - dogfooding
  - backlog
  - needs-review
---

# Package gaps

Use this page to capture product gaps discovered while dogfooding
`@wiki0/core`, `@wiki0/cli`, `@wiki0/mcp`, and the wiki0 skills.

## Current gap map

- Search should accept plain human text safely. Dogfooding found raw
  FTS errors for queries like `@wiki0/core`.
- Page operations should resolve by path, frontmatter `title`, and
  `aliases`; agents naturally ask for pages by human title.
- CLI docs mention `wiki0 lint`, but the command is not implemented
  yet.
- `facts` exists in the SQLite schema but has no core API, CLI
  command, MCP tool, or review workflow.
- Graph/backlink data is partly present through `page_links`, but
  there is no graph API or command.
- Package READMEs are listed for publishing but are missing.
- Skills describe source ingestion and review workflows that are ahead
  of available product commands.

## Started fixes

- Added a core plain-text FTS query path so punctuation-heavy queries
  are escaped before reaching SQLite.
- Added page resolution by frontmatter title and aliases for page
  reads, appends, and frontmatter updates.

## Dogfood rule

When a tool failure interrupts a wiki operation, record it here or in
[[dogfooding/tool-improvements]] before moving on.

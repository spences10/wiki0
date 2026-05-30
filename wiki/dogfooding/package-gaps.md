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

## Lint command dogfood

- Added `lint_wiki` in core and exposed it as `wiki0 lint` plus an MCP
  `lint_wiki` tool.
- Current lint checks unresolved wikilinks and duplicate page
  titles/aliases.
- Running `node packages/cli/dist/index.js lint --root .` found
  unresolved `[[Changesets]]`, unresolved
  `[[wiki0 package workflow]]`, and duplicate `wiki0` naming between
  the index and project page.
- Next product gap: wikilink resolution should probably use the same
  path/title/alias rules as page reads, not only slugified paths.

## Lint follow-up

- Added `[[Changesets]]` and `[[wiki0 package workflow]]` pages so the
  new lint command could immediately dogfood unresolved-link fixes.
- After re-indexing, `wiki0 lint --root .` exits successfully with one
  warning for duplicate `wiki0` naming between the root index and
  project page.

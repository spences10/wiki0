# @wiki0/core

## 0.0.4

### Patch Changes

- c39db70: Add package version index metadata, MCP safety tests, and
  cleanup completed dogfood backlog notes.
- aee3b2e: Add chunk-level wiki context retrieval, line-cited
  snippets, and direct page:line chunk lookup.
- df757d1: Add bootstrap source ingestion, expose source options, and
  normalize SQLite rows without unsafe casts.
- 009e3d6: Add fact source provenance and stale-index warnings for
  wiki context retrieval.
- 93373b2: Add topic threads, operation logs, frontmatter ranking, and
  source candidate fact extraction.

## 0.0.3

### Patch Changes

- 127e5db: Add deterministic wiki planning via core workflow, CLI plan
  command, MCP tool, prompt, and resource.
- 8c0fea3: Relax broad wiki searches with stopword filtering and OR
  fallback when strict matching returns nothing.
- 0aa1a23: Add safe wiki bootstrap pages from the planning workflow
  across core, CLI, and MCP.
- c5534dc: Harden YAML, add index status and MCP safety, switch SQLite
  to node:sqlite, improve bootstrap templates.

## 0.0.2

### Patch Changes

- dfcc663: Resolve indexed wikilinks and backlinks through page titles
  and aliases, matching page read behavior.
- 6204962: Add wiki linting for unresolved links and duplicate names
  across core, CLI, and MCP.
- f03c822: Add structured wiki facts with page links, confidence
  metadata, and core, CLI, MCP access.
- edb5b55: Fix plain-text search, resolve pages by title/alias, and
  document dogfooding package gaps for follow-up.
- 94fa6b6: Expose indexed wiki graph nodes and links through core,
  CLI, and MCP.

## 0.0.1

### Patch Changes

- 73a2444: Refactor core into focused modules with colocated tests and
  move SQLite schema into SQL file.
- a0d90fd: Prepare wiki0 CLI, core, and MCP packages for initial
  public npm publishing.

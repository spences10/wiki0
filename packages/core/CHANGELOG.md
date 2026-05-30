# @wiki0/core

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

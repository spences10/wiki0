# @wiki0/mcp

## 0.0.5

### Patch Changes

- 0ff1af5: Improve document ingest sync, full-text preservation, extraction
  interfaces, and Markdown frontmatter parsing.
- 87937d8: Replace ingest and bootstrap workflows with document sync commands,
  tools, types, and documentation.
- 532b5d5: Add document parsing and recurring ingest workflow for rebuildable
  Markdown-backed wiki source pages.
- fb32a79: Add recursive sync filters, derived facts, proposed pages, and real
  PDF/DOCX smoke tests.
- Updated dependencies [0ff1af5]
- Updated dependencies [87937d8]
- Updated dependencies [532b5d5]
- Updated dependencies [fb32a79]
  - @wiki0/core@0.0.5

## 0.0.4

### Patch Changes

- aee3b2e: Add chunk-level wiki context retrieval, line-cited
  snippets, and direct page:line chunk lookup.
- df757d1: Add bootstrap source ingestion, expose source options, and
  normalize SQLite rows without unsafe casts.
- 009e3d6: Add fact source provenance and stale-index warnings for
  wiki context retrieval.
- 93373b2: Add topic threads, operation logs, frontmatter ranking, and
  source candidate fact extraction.
- Updated dependencies [c39db70]
- Updated dependencies [aee3b2e]
- Updated dependencies [df757d1]
- Updated dependencies [009e3d6]
- Updated dependencies [93373b2]
  - @wiki0/core@0.0.4

## 0.0.3

### Patch Changes

- 127e5db: Add deterministic wiki planning via core workflow, CLI plan
  command, MCP tool, prompt, and resource.
- c0e9f98: Add wiki0 info tool, structured MCP JSON responses, and
  recoverable tool execution error results.
- 0aa1a23: Add safe wiki bootstrap pages from the planning workflow
  across core, CLI, and MCP.
- c5534dc: Harden YAML, add index status and MCP safety, switch SQLite
  to node:sqlite, improve bootstrap templates.
- Updated dependencies [127e5db]
- Updated dependencies [8c0fea3]
- Updated dependencies [0aa1a23]
- Updated dependencies [c5534dc]
  - @wiki0/core@0.0.3

## 0.0.2

### Patch Changes

- 6204962: Add wiki linting for unresolved links and duplicate names
  across core, CLI, and MCP.
- f03c822: Add structured wiki facts with page links, confidence
  metadata, and core, CLI, MCP access.
- 94fa6b6: Expose indexed wiki graph nodes and links through core,
  CLI, and MCP.
- Updated dependencies [dfcc663]
- Updated dependencies [6204962]
- Updated dependencies [f03c822]
- Updated dependencies [edb5b55]
- Updated dependencies [94fa6b6]
  - @wiki0/core@0.0.2

## 0.0.1

### Patch Changes

- a0d90fd: Prepare wiki0 CLI, core, and MCP packages for initial
  public npm publishing.
- 962aecb: Refactor CLI and MCP entrypoints into focused modules with
  colocated tests and cleaner validation.
- Updated dependencies [73a2444]
- Updated dependencies [a0d90fd]
  - @wiki0/core@0.0.1

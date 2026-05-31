---
title: Tool improvements
aliases:
  - dogfooding issues
  - wiki0 tool backlog
tags:
  - dogfooding
  - tooling
---

# Tool improvements

Dogfooding wiki0 should feed friction back into the tool backlog.

## Issues noticed while capturing npm publishing notes

- `search_wiki` passed raw FTS syntax through to SQLite. A query
  containing `@wiki0` failed with `fts5: syntax error near "@"`. The
  tool should either escape user queries, offer a plain-language query
  mode, or return a friendlier error with retry guidance.
- `read_page` by frontmatter title failed for `Core package` because
  the file lives at `wiki/packages/core.md`, while title slug lookup
  tried `wiki/core-package.md`. The tool should resolve by indexed
  title/alias, not only by slugified path.

## Principle

Every dogfooding failure should become either documentation, a test,
or a product improvement issue.

## Issues noticed while fixing package gaps

- The in-session MCP tools may not be using the local package build.
  After adding alias/title resolution in `packages/core`,
  `node packages/cli/dist/index.js page read "Package gaps" --root .`
  worked, but MCP `read_page` for alias `wiki0 package backlog` still
  tried `wiki/wiki0-package-backlog.md`. This should become an MCP
  dogfood/version check so local changes are validated through the
  actual MCP server under development.

## Review workflow dogfood gap

- A package review initially inspected source and external docs
  without invoking the published `wiki0` MCP tools, which undermined
  the goal of dogfooding.
- Follow-up used published `wiki0` MCP tools (`index_wiki`,
  `read_page`, `search_wiki`, `get_wiki_context`, `review_wiki`) and
  confirmed the tools work for basic project-memory retrieval, while
  broad natural-language queries still return sparse results.

## Wiki building workflow dogfood

- Created [[product/wiki-building-workflow]] using the current `wiki0`
  MCP tools to capture a general source-to-wiki workflow.
- This exposed a product gap: agents need a discoverable
  prompt/resource or high-level planning tool, otherwise "make a wiki"
  depends too much on the client's ambient instructions.

## Search dogfood after workflow implementation

- Searching for
  `wiki building workflow gap plan_wiki build_wiki version capability structuredContent search`
  returned no results even though [[product/wiki-building-workflow]]
  and this page contain several of those terms.
- This reinforces that `search_wiki` needs better broad-query
  behavior, likely stopword/noise handling, OR fallback, and
  phrase/term relaxation.

## Search relaxation implementation

- Added an OR fallback for broad plain-text searches when the strict
  FTS query returns no rows.
- Added stopword filtering for the relaxed query path.
- Dogfooding through the local CLI after rebuilding core returned a
  result for the previously failing broad workflow search.

## Search fallback MCP version gap

- After committing relaxed broad search locally, MCP
  `get_wiki_context` for
  `version capability structuredContent isError bootstrap_wiki templates YAML frontmatter root sandbox read-only workflow`
  failed with `no such column: only`.
- This suggests the active published MCP server has not picked up the
  local search fallback yet, reinforcing the need for a
  version/capability tool and clearer dev-vs-published MCP dogfood
  checks.

## MCP info and response ergonomics implementation

- Added a `wiki0_info` MCP tool that reports package version, server
  type, capabilities, and feature flags.
- Updated JSON MCP responses to include `structuredContent` while
  preserving text content for compatibility.
- Wrapped MCP tool handlers so thrown execution errors return
  `isError: true` with structured error details instead of surfacing
  as opaque protocol failures.
- Updated the MCP server metadata version to come from package
  metadata instead of a hard-coded `0.0.0`.

## Remaining backlog after wiki workflow dogfood

Completed follow-up items:

- Frontmatter/YAML hardening now uses a real YAML parser/serializer.
- MCP root safety now has allowed-root and read-only configuration.
- Index freshness/status now tracks indexed-at time, schema version,
  package version, and stale state through CLI and MCP.
- Review queue cleanup accepted proposed decisions and removed stale
  `needs-review` tags from dogfood/product pages.
- Core SQLite access now uses Node's built-in `node:sqlite` instead of
  `better-sqlite3`.

Remaining future enhancement:

- Bootstrap ingestion now creates source notes with excerpts,
  candidate facts, and open questions. A later pass can add richer
  semantic extraction and automated fact promotion.

Completed in this dogfood run:

- `plan_wiki` workflow across core, CLI, MCP, prompt, and resource.
- Broad search fallback with stopword filtering and relaxed OR query.
- `wiki0_info`, structured MCP JSON responses, and `isError` tool
  errors.
- `bootstrap_wiki` starter page creation across core, CLI, and MCP.

## Bootstrap source ingestion follow-up

- Added optional bootstrap source ingestion through `sources` and
  `ingestSources` options.
- Ingestion creates source note pages for explicit paths, detected
  URLs in scope text, and auto-detected local sources.
- Source notes include file excerpts when local, URL extraction
  prompts when remote, candidate facts, and open questions.
- Replaced remaining `node:sqlite` `as unknown as` row casts with
  explicit row-normalization helpers for graph edges and backlinks.

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
  `ingest_sources` options.
- Ingestion creates source note pages for explicit paths, detected
  URLs in scope text, and auto-detected local sources.
- Source notes include file excerpts when local, URL extraction
  prompts when remote, candidate facts, and open questions.
- Replaced remaining `node:sqlite` `as unknown as` row casts with
  explicit row-normalization helpers for graph edges and backlinks.

## Chunk context dogfood

- Added chunk-level indexing for wiki pages so context results cite
  `wiki/path.md:start-end` instead of only whole pages.
- Added direct indexed chunk lookup for page or `page:line` targets
  through CLI `wiki0 show` and core `show_wiki_chunk`.
- Dogfooding
  `wiki0 context "chunk context path line citations source ingestion" --root . --json`
  returned section-level results with headings and full chunk bodies.
- Dogfooding
  `wiki0 show dogfooding/tool-improvements.md:127 --root . --json`
  returned the expected source-ingestion section chunk.
- MCP exposure is implemented as `show_wiki_chunk`; restart the dev
  MCP process before validating that new tool path.

## Fact provenance and stale context dogfood

- Added optional fact provenance through `source` and `source_quote`
  inputs.
- Facts can now store source path, heading, line range, and quote
  alongside page/category/confidence metadata.
- `get_wiki_context` now reports stale-index warnings in structured
  output and Markdown instead of silently returning potentially
  outdated context.
- Dogfooding
  `wiki0 facts add ... --source dogfooding/tool-improvements.md:138 --root .`
  stored the expected heading, line range, and source quote.

## Topic threads operation log and ranking dogfood

- Added lightweight topic-thread listing from indexed headings and
  page tags through CLI and MCP.
- Added an operation log for page writes, indexing, fact writes, and
  bootstrap workflows.
- Added frontmatter-aware chunk ranking using `priority`, `status`,
  and `tags` metadata.
- Bootstrap source notes now extract simple candidate facts from lines
  containing requirement-style language.
- Dogfooding `wiki0 topics --root . --limit 3` returned project topic
  clusters, and `wiki0 events --root . --limit 3` returned recent
  index operations.
- Dogfooding bootstrap against a temporary source produced a
  `Candidate facts` chunk with extracted source lines.

## Schema migration follow-up

- The current runtime `ALTER TABLE` guards were added to keep the
  active dogfood SQLite index usable while iterating quickly across
  schema versions.
- Because `.wiki0/wiki0.sqlite` is a rebuildable cache and wiki0 is
  not yet used outside this repo, this does not need to become a full
  migration framework immediately.
- Next iteration should decide between two explicit paths:
  - keep the index disposable and rebuild automatically when
    `schema_version` changes, or
  - add a small migration module if durable user data moves into
    SQLite.
- Important distinction: facts and operation logs are currently stored
  in SQLite, so either they need export/rebuild semantics or they
  should be treated as durable enough to justify migrations.

## Document parsing core dogfood

- Added [[product/document-ingestion]] to capture the
  rebuildable-index ingestion plan.
- Added core `parse_document` / `document_kind` primitives for `.md`,
  `.txt`, `.pdf`, `.docx`, and unsupported files.
- Added parser dependencies in `@wiki0/core`: `pdf-parse` and
  `mammoth`.
- Validation:
  `pnpm --filter @wiki0/core run test:self -- documents.test.ts`,
  `pnpm --filter @wiki0/core run check:self`, and
  `pnpm --filter @wiki0/core run build:self` passed.

## Recurring document ingest dogfood

- Added core `ingest_documents` to recursively ingest supported source
  files into Markdown source pages under `sources/ingested` and
  rebuild the index by default.
- Added CLI `wiki0 ingest <sources>` and MCP `ingest_documents` for
  recurring ingestion after bootstrap.
- Ingested source pages preserve extracted text, parser metadata,
  parser warnings, candidate facts, and open questions in Markdown so
  the SQLite database remains rebuildable.
- Dogfooded the built CLI against a temporary wiki with
  `node packages/cli/dist/index.js ingest docs --root <tmp> --json`;
  it created `sources/ingested/docs-runtime-md.md` and indexed one
  page.

## Document ingest fingerprint dogfood

- Added SHA-256 `source_fingerprint` frontmatter to generated source
  pages.
- Recurring ingest now reports unchanged pages without rewriting them,
  changed pages without overwriting user-visible Markdown by default,
  and updated pages when `overwrite` is supplied.
- Dogfooded the built CLI against a temporary wiki: second ingest
  returned `unchanged`, modified source returned `changed`, and
  `--overwrite` returned `updated`.

## Full text ingest dogfood

- Removed the 10k-character truncation from ingested source pages so
  parsed PDF/DOCX/text content remains fully inspectable in Markdown.
- Added adaptive Markdown code fences for extracted text containing
  backticks.
- Added a long text fixture to verify source pages preserve content
  beyond 10k characters and keep fence structure valid.

## Document extract interface dogfood

- Added CLI `wiki0 extract <source>` for read-only document parsing
  without writing wiki pages.
- Added MCP `parse_document` schema/tool and `wiki-document-parsing`
  feature flag for the dev server after reload.
- Dogfooded the built CLI against a temporary Markdown source; it
  returned normalized text, title, kind, and warnings as JSON.

## Markdown extraction frontmatter dogfood

- Markdown document parsing now strips YAML frontmatter from
  normalized text and exposes primitive frontmatter values as parser
  metadata.
- This keeps indexed source text focused on visible documentation
  while preserving useful metadata such as title and status.
- Dogfooded
  `wiki0 extract wiki/product/document-ingestion.md --root . --json`;
  output text starts at `# Document ingestion` and metadata includes
  frontmatter title/status.

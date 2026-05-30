---
title: Tool improvements
aliases:
  - dogfooding issues
  - wiki0 tool backlog
tags:
  - dogfooding
  - tooling
  - needs-review
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

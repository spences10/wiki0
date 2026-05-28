---
title: Core package
aliases:
  - @wiki0/core
  - packages/core
tags:
  - package
  - core
---

# Core package

`@wiki0/core` is the shared engine for wiki0.

## Responsibilities

- Parse Markdown and `[[WikiLinks]]`.
- Normalize titles and slugs.
- Build and query the SQLite index.
- Compute backlinks, graph data, facts, and search results.
- Provide reusable primitives for CLI, MCP, and web UI code.

## Packaging

Core should be published to npm as a library dependency. Most users
will not install it directly, but `wiki0` CLI and the MCP package
should depend on it.

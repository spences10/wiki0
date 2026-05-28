---
title: CLI
aliases:
  - wiki0 CLI
  - packages/cli
tags:
  - interface
  - package
---

# CLI

The wiki0 CLI is the local command interface for a wiki.

## Responsibilities

- Initialize a wiki folder structure.
- Rebuild the SQLite index from Markdown.
- Search and retrieve context with citations.
- Run lint and review checks over wiki pages.
- Optionally launch a local web UI with `wiki0 serve`.

## Packaging

The CLI should be published to npm as the user binary, likely `wiki0`.
It depends on [[packages/core]].

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

## Serve command

`wiki0 serve [root]` is the planned local web UI entry point. It
should prepare the wiki index for `root`, set the active web UI root,
start the local web server, and open the browser.

The current implementation is a monorepo/development bridge: it
refreshes the index when stale and launches `wiki0-web` through the
workspace dev script with `WIKI0_ROOT` set. A packaged release should
replace this with a bundled static/server build so users do not need
the source monorepo or pnpm workspace.

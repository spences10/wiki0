---
title: Web app
aliases:
  - wiki0 web
  - apps/wiki0-web
tags:
  - interface
  - web
  - human-facing
---

# Web app

The wiki0 web app is the optional human-facing interface for
inspecting and reviewing wiki memory.

## Purpose

The web app should answer questions like:

- What does my AI know?
- Where did this claim come from?
- What pages are orphaned, stale, duplicated, or conflicting?
- What agent-written changes need review?
- How is knowledge connected?

## Stance

The web app is not the core product. The core product is Markdown
wiki + SQLite index + CLI/MCP tools. If shipped locally, the web UI
should likely be bundled behind `wiki0 serve` rather than published as
a separate npm app package.

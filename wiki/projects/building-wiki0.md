---
title: Building wiki0
status: active
tags:
  - project
  - dogfood
  - architecture
aliases:
  - wiki0 build log
---

# Building wiki0

Status: active

This page tracks product and architecture thinking while building
[[projects/wiki0]]. The goal is to dogfood wiki0 as the project memory
for wiki0 itself.

## Product purpose

wiki0 is a local-first, inspectable memory system for AI agents.
Markdown is the source of truth; SQLite is a rebuildable index/cache;
CLI and MCP are the primary agent-facing interfaces.

The web app is optional and human-facing. It should help users
inspect, review, browse, and understand agent memory rather than
becoming the center of the product.

## Current stance

- A wiki is a folder chosen by the user, not a hidden global home
  directory.
- `wiki0 init` should default to the current directory when no path is
  provided.
- Users may create multiple siloed wikis for different projects,
  clients, or contexts.
- CLI and MCP should operate against one selected wiki root per
  command/session.
- Later, wiki0 can add a registry or federated search across multiple
  wiki roots.

## Interfaces

- [[interfaces/cli]]: local automation and user commands.
- [[interfaces/mcp]]: agent access to wiki operations.
- [[interfaces/web-app]]: human browsing, review, graph views, and
  inspection.

## Open questions

- How should the MCP server select its active wiki root?
- Should `wiki0 serve` bundle the web UI inside the CLI package?
- What review queues or trust markers should exist for agent-written
  claims?

## Metadata direction

Frontmatter should be optional but supported for common PKM metadata.
See [[decisions/optional-frontmatter]].

## Test coverage

Added core tests for slugging, page paths, optional frontmatter
parsing, title fallback, wikilink parsing, and page create/read/append
behavior.

## Index and search

Implemented initial SQLite indexing and FTS search for Markdown pages.
The CLI now supports real `wiki0 index` and `wiki0 search` commands
backed by [[packages/core]].

Current index behavior stores pages, page links, content hashes,
modification times, and FTS rows. Search returns path, title, snippet,
and rank.

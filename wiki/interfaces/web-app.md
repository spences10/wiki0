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

## Local serve model

`wiki0 serve [root]` is the preferred local web-app entry point. The
`root` argument identifies the Markdown wiki root.

The serve command should find or create the wiki SQLite index under
`.wiki0/`, keep it fresh, and expose a browser UI for that local wiki.

Users should not need to select the SQLite database during normal
onboarding. Direct database selection can exist as an advanced mode
for inspection or debugging.

## Data model

- Markdown files are the source of truth.
- SQLite is a rebuildable local index/cache.
- The web app reads the SQLite index for fast search, backlinks, graph
  data, facts, and review queues.
- The web app reads Markdown files for full page content and source
  display.

## Initial product surface

- Search indexed pages, chunks, and facts.
- Open a page with Markdown content, frontmatter, wikilinks,
  backlinks, and source references.
- View a graph derived from indexed wiki links.
- Review stale pages, orphan pages, duplicate names, broken links, and
  agent-written changes.
- Rebuild or refresh the index when it is missing or stale.

## Hosted site role

`wiki0.app` can start as a landing page, docs site, and demo. A hosted
site can later connect to a local `wiki0 serve` process, but local
wiki serving remains rooted in Markdown files and the local SQLite
index.

## Serve and hosted onboarding

The first production path should separate the hosted site from local
private data:

1. `wiki0.app` is the public entry point for marketing, docs, and a
   sample/demo wiki.
2. A user with a real local wiki installs or runs the CLI and starts a
   local server:

   ```sh
   wiki0 serve ~/path/to/wiki
   ```

3. `wiki0 serve` resolves the Markdown wiki root, creates or refreshes
   `.wiki0/wiki0.sqlite`, starts a localhost web server, and opens the
   browser.
4. The local web server serves both the SvelteKit UI and local
   JSON/API routes from the same origin so the UI can read local
   Markdown and the SQLite index without sending wiki data to
   `wiki0.app`.
5. A later hosted bridge may let `wiki0.app` discover a local
   `wiki0 serve` process with an explicit one-time token, but that is
   a follow-up. The safe default is local-first: private wiki data
   stays on localhost.

---
title: Landing page and local UI
type: decision
status: accepted
supersedes: [wiki/decisions/0005-web-app-opens-local-folders.md]
date: 2026-10-14
---

# Landing page and local UI

## Decision

- `apps/wiki0-web` becomes the public landing page for wiki0.app.
- A separate package, `@wiki0/ui`, is a local docs browser for one
  project: each doc rendered with its links working, search with
  citations, and a health area for index status, lint and the link
  graph. It reads through `@wiki0/core` only.
- `wiki0 ui` starts it. `@wiki0/cli` depends on `@wiki0/ui` and loads
  it only when that command runs.

## Why

- Agents are the main users of wiki0, but a person often wants to read
  the docs an agent cites. The intended flow is an agent running
  `npx @wiki0/cli ui` and handing over the URL, so the command prints
  the URL first, returns when not run in a terminal, and reuses a
  running server instead of starting another.
- Keeping the server in its own package, rather than in the CLI, is
  what [0004](0004-cli-serves-web-ui.md) lacked: the CLI only launches
  it, and file access goes through core, which reads only indexed
  documents inside the root.

## Consequences

- The server binds to `127.0.0.1`, needs a per-server token for every
  API request, checks the Host header and sends a strict CSP, since
  docs can contain raw HTML and it is rendered as written.
- It is read-only apart from rebuilding the index.

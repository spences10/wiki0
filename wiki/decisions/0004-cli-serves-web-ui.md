---
title: CLI serves the web UI
type: decision
status: superseded
superseded_by: wiki/decisions/0005-web-app-opens-local-folders.md
date: 2026-05-28
---

# CLI serves the web UI

## Decision

`wiki0 serve [root]` refreshes the index and launches the SvelteKit
web app against that root.

## Why it was replaced

The CLI ended up hosting a web app and bridging local files into the
browser, which mixed package responsibilities. The command was removed
on 2026-05-31. Replaced by
[[decisions/0005-web-app-opens-local-folders]].

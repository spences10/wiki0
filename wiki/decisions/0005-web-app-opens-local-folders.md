---
title: Web app opens local folders
type: decision
status: superseded
superseded_by: wiki/decisions/0010-landing-page-and-local-ui.md
date: 2026-06-02
---

# Web app opens local folders

## Decision

The hosted web app asks the user to pick a local folder with the
browser File System Access API and builds its view in the browser.

## Why it was replaced

It was never built, and it would duplicate the indexing, link
resolution and ranking that live in `@wiki0/core`. Replaced by
[[decisions/0010-landing-page-and-local-ui]].

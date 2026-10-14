---
title: Docs are the source of truth
type: decision
status: accepted
date: 2026-05-30
---

# Docs are the source of truth

## Decision

The project's own files (Markdown, and PDF/DOCX/TXT when included) are
the only source of truth. The SQLite index is a cache that can be
deleted and rebuilt from them at any time.

## Why

- Files are diffable, reviewable in git and readable without wiki0.
- Anything stored only in the index is lost on rebuild, so nothing
  durable may live only there.

## Consequences

- A schema change rebuilds the index instead of migrating it.
- Earlier features that stored facts and events only in SQLite broke
  this rule and were removed (see [0007](0007-read-only-no-llm.md)).

---
title: Lexical search, no embeddings
type: decision
status: accepted
date: 2026-10-14
---

# Lexical search, no embeddings

## Decision

Search uses SQLite FTS5 (BM25 with stemming) plus document authority.
There are no embeddings or vector indexes.

## Why

- Keeps the CLI and MCP server small, fast to install and free of
  model downloads.
- At project-docs scale, keyword search with an agent that can retry
  does well; measured gaps for dense retrieval show up on corpora far
  larger than a repo's docs.
- Most wrong answers come from stale or superseded docs, which ranking
  by status fixes and embeddings do not.

## Revisit when

The benchmark shows misses where the question and the docs use
different words for the same thing. The cheap option then is an
optional static-embedding lane fused with BM25, not replacing it.

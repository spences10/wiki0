---
title: Core package
aliases: ['@wiki0/core']
type: reference
---

# Core package

`@wiki0/core` holds all indexing, link resolution, search and lint
logic. The CLI and MCP server only parse arguments and call it, so a
behaviour change belongs here first. Function list:
[the package README](../../packages/core/README.md).

| Module                   | Covers                                          |
| ------------------------ | ----------------------------------------------- |
| `storage.ts`             | project root, index location, opening the index |
| `config.ts`              | `wiki0.toml`                                    |
| `files.ts`               | which files are indexed                         |
| `chunks.ts`              | heading chunks and line ranges                  |
| `links.ts`               | link extraction, anchors, resolution            |
| `indexer.ts`             | building the index, staleness                   |
| `search.ts`              | ranking, relaxation, `show`, context            |
| `lint.ts`                | lint rules                                      |
| `graph.ts`, `catalog.ts` | link graph and document list                    |

See [Indexing](../reference/indexing.md),
[Search and show](../reference/search.md) and
[Links and lint](../reference/links-and-lint.md).

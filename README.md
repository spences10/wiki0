# wiki0

[![CI](https://github.com/spences10/wiki0/actions/workflows/ci.yml/badge.svg)](https://github.com/spences10/wiki0/actions/workflows/ci.yml)
[![Semgrep](https://github.com/spences10/wiki0/actions/workflows/semgrep.yml/badge.svg)](https://github.com/spences10/wiki0/actions/workflows/semgrep.yml)
[![Renovate](https://img.shields.io/badge/renovate-enabled-brightgreen.svg)](https://renovatebot.com)
[![built with vite+](https://img.shields.io/badge/built%20with-Vite+-646CFF?logo=vite&logoColor=white)](https://viteplus.dev)
[![tested with vitest](https://img.shields.io/badge/tested%20with-Vitest-6E9F18?logo=vitest)](https://vitest.dev)

Local-first AI memory as a Markdown wiki backed by SQLite search and
MCP tools.

## Value prop

wiki0 gives your AI an explicit, inspectable memory: a Markdown wiki
it can read and write, backed by a disposable SQLite index for fast
search, backlinks, facts, and graph views. No opaque vendor memory;
the knowledge stays local, diffable, and portable.

## Shape

```txt
wiki0/
  wiki/             # canonical Markdown knowledge
  .wiki0/           # local SQLite index/cache
  packages/core/    # schema, indexing, wikilinks, search primitives
  packages/cli/     # wiki0 init/index/search/context/lint/graph/facts
  packages/mcp/     # MCP server wrapping core operations
  apps/web/         # SvelteKit/mdsvex human interface
```

## Planned workflow

```sh
wiki0 init ~/my-wiki
wiki0 plan --source_type codebase --scope "current repository"
wiki0 bootstrap --source_type docs --scope "docs folder"
wiki0 index
wiki0 search "why sqlite"
wiki0 context "what did we decide about memory?"
wiki0 lint
wiki0 graph
wiki0 topics
wiki0 events
wiki0 facts add "SQLite is a rebuildable index" --category decision
```

Agents use the MCP server to create pages, link related knowledge,
retrieve context with citations, and queue uncertain claims for
review.

## Design stance

- Markdown is source of truth.
- SQLite is a rebuildable index/cache.
- `[[WikiLinks]]` follow an Obsidian-compatible subset.
- Git/cloud sync moves the wiki between machines; the index can be
  rebuilt.
- Web UI is optional, for browsing, review, and graph visualisation.

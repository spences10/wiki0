# wiki0

Local-first AI memory as a Markdown wiki backed by SQLite search and MCP tools.

## Value prop

wiki0 gives your AI an explicit, inspectable memory: a Markdown wiki it can read and write, backed by a disposable SQLite index for fast search, backlinks, facts, and graph views. No opaque vendor memory; the knowledge stays local, diffable, and portable.

## Shape

```txt
wiki0/
  wiki/             # canonical Markdown knowledge
  .wiki0/           # local SQLite index/cache
  packages/core/    # schema, indexing, wikilinks, search primitives
  packages/cli/     # wiki0 init/index/search/context/lint
  packages/mcp/     # MCP server wrapping core operations
  apps/web/         # SvelteKit/mdsvex human interface
```

## Planned workflow

```sh
wiki0 init ~/my-wiki
wiki0 index
wiki0 search "why sqlite"
wiki0 context "what did we decide about memory?"
wiki0 lint
```

Agents use the MCP server to create pages, link related knowledge, retrieve context with citations, and queue uncertain claims for review.

## Design stance

- Markdown is source of truth.
- SQLite is a rebuildable index/cache.
- `[[WikiLinks]]` follow an Obsidian-compatible subset.
- Git/cloud sync moves the wiki between machines; the index can be rebuilt.
- Web UI is optional, for browsing, review, and graph visualisation.

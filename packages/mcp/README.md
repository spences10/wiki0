# @wiki0/mcp

MCP server exposing wiki0 Markdown memory operations to agents.

## Install

```sh
pnpm add -g @wiki0/mcp
```

The package exposes the `wiki0-mcp` binary.

## Tool surface

- `wiki0_info` for server version, capabilities, and feature flags
- `parse_wikilinks`, `parse_markdown`, `parse_document`,
  `slugify_title`
- `plan_wiki` for a deterministic source-to-wiki workflow and starter
  page plan
- `sync_documents` to sync source documents into Markdown source pages
  and index the wiki
- `create_page`, `read_page`, `append_page`, `set_page_frontmatter`
- `index_wiki`, `index_status`, `search_wiki`, `get_wiki_context`
- `show_wiki_chunk` for known page or `page:line` retrieval
- `backlinks_for_page`, `graph_wiki`, `lint_wiki`, `review_wiki`
- `list_topic_threads`, `list_wiki_events`
- `add_fact`, `list_facts` with optional `source` / `source_quote`
  provenance

## Prompt and resource

The server also exposes a `build_wiki` prompt and a
`wiki0://workflows/wiki-building` resource so MCP clients can discover
how to turn source material into a linked wiki instead of guessing the
workflow from individual tools. JSON tools return both text content
and structured content, and recoverable tool failures are returned
with `isError: true`.

## Root handling

Each tool accepts an optional `root` argument. Markdown under `wiki/`
is canonical; `.wiki0/wiki0.sqlite` is a local rebuildable index.

By default the MCP server only allows roots under its current working
directory. Set `WIKI0_ALLOWED_ROOTS` to a comma-separated list of
allowed root directories. Set `WIKI0_READ_ONLY=true` to block write
operations such as page creation, frontmatter updates, fact writes,
index rebuilds, and document sync.

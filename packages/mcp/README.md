# @wiki0/mcp

MCP server exposing wiki0 Markdown memory operations to agents.

## Install

```sh
pnpm add -g @wiki0/mcp
```

The package exposes the `wiki0-mcp` binary.

## Tool surface

- `parse_wikilinks`, `parse_markdown`, `slugify_title`
- `create_page`, `read_page`, `append_page`, `set_page_frontmatter`
- `index_wiki`, `search_wiki`, `get_wiki_context`
- `backlinks_for_page`, `graph_wiki`, `lint_wiki`, `review_wiki`
- `add_fact`, `list_facts`

## Root handling

Each tool accepts an optional `root` argument. Markdown under `wiki/`
is canonical; `.wiki0/wiki0.sqlite` is a local rebuildable index.

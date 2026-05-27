# wiki0 scope

## Product layers

1. **Knowledge format**: Markdown wiki with Obsidian-style `[[WikiLinks]]`.
2. **Agent/index layer**: CLI, MCP, and SQLite/FTS index.
3. **Human interface**: SvelteKit site for browsing, review, backlinks, search, and graph views.

## MVP boundary

- Create/init a wiki folder.
- Parse and resolve wikilinks.
- Index Markdown pages into SQLite.
- Search/context/show from CLI.
- Expose safe MCP tools for parse/search/context/upsert.

## Later

- mdsvex page rendering.
- LayerChart graph/scatter visualisation.
- Fact extraction/review queue.
- Remote/server mode.

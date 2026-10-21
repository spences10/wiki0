---
title: MCP server
aliases: [MCP, '@wiki0/mcp']
type: reference
---

# MCP server

`@wiki0/mcp`, binary `wiki0-mcp`. Tool list:
[the package README](../../packages/mcp/README.md).

- Intended agent flow: `search_docs`, then `show_section` with a
  result's citation, then `show_section` again with `next` if the text
  was cut short.
- After editing docs, the agent calls `check_docs`.
- Roots outside the server's working directory need
  `WIKI0_ALLOWED_ROOTS`. `WIKI0_READ_ONLY=true` blocks `index_docs`
  and `check_docs`, the only tools that write (to the index only).
- If the server and the CLI see different environments they can
  resolve different index files; set `WIKI0_INDEX` for both
  ([Storage](../reference/storage.md#index-location)).

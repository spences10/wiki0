# @wiki0/mcp

MCP server for wiki0: search a project's docs and get the right
section with a `path:start-end` citation.

## Install

```sh
pnpm add -g @wiki0/mcp
```

The package exposes the `wiki0-mcp` binary.

## Tools

| Tool             | Purpose                                                        |
| ---------------- | -------------------------------------------------------------- |
| `search_docs`    | One cited section per document, authoritative docs first       |
| `show_section`   | Text of a citation, `path:line`, `path#heading`, path or title |
| `get_context`    | Search plus the top sections as cited Markdown                 |
| `index_docs`     | Index the project docs                                         |
| `index_status`   | Index path and staleness                                       |
| `lint_docs`      | Broken links and anchors with `path:line`                      |
| `link_graph`     | Documents and links                                            |
| `list_documents` | Outline, status, type and link counts per document             |
| `backlinks`      | Documents linking to a document                                |
| `wiki0_info`     | Version and safety settings                                    |

Tools return JSON as both text and structured content; failures return
`isError: true`.

## Roots and safety

Each tool takes an optional `root`. The server only allows roots under
its working directory unless `WIKI0_ALLOWED_ROOTS` lists others
(comma-separated). `WIKI0_READ_ONLY=true` blocks `index_docs`, the
only tool that writes (to the index, never to your files).

The index lives in `~/.cache/wiki0/<project>/index.db`. Set
`WIKI0_INDEX` so the CLI and the server use the same file if their
environments differ.

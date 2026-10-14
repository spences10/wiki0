# wiki0

[![built with vite+](https://img.shields.io/badge/built%20with-Vite+-646CFF?logo=vite&logoColor=white)](https://viteplus.dev)
[![tested with vitest](https://img.shields.io/badge/tested%20with-Vitest-6E9F18?logo=vitest)](https://vitest.dev)

Search a project's docs and get the right section with a
`path:start-end` citation, so agents don't read whole documents.

wiki0 indexes the Markdown already in a repo (plus PDF, DOCX and TXT
if you include them) into SQLite full-text search. Results are ranked
so current, authoritative docs come first, and superseded docs point
to their replacement. It never calls an LLM and never rewrites your
files.

## Use

```sh
npx @wiki0/cli index
npx @wiki0/cli search "how do deploys work"
npx @wiki0/cli show docs/deploys.md:12-40
npx @wiki0/cli lint
```

Agents use the same operations through the MCP server (`@wiki0/mcp`,
binary `wiki0-mcp`).

## What affects ranking

Frontmatter is optional; when present these fields are used:

| Field                         | Effect                                                                     |
| ----------------------------- | -------------------------------------------------------------------------- |
| `status`                      | `accepted`/`verified` rank higher, `draft` lower, `superseded` much lower  |
| `type`                        | `decision`, `spec`, `rule`, `policy` rank higher; `notes`, `meeting` lower |
| `supersedes`, `superseded_by` | links an old doc to its replacement                                        |
| `aliases`                     | extra names to match and to resolve `[[wikilinks]]`                        |
| `priority`                    | small boost or penalty                                                     |
| `date`                        | older notes and meeting docs rank lower                                    |

Without `type`, folders such as `adr/`, `decisions/`, `meetings/` and
`notes/` set it.

## Config

Optional `wiki0.toml` at the repo root:

```toml
include = ["docs/**/*.md", "adr/**/*.md"]
exclude = ["docs/archive/**"]

[index]
location = "local" # default "cache"
```

The index lives in `~/.cache/wiki0/<project>/index.db` unless
`location = "local"` (`.wiki0/`) or `WIKI0_INDEX` is set.
`wiki0 status` prints the path.

## Packages

- `packages/core`: indexing, link resolution, search and lint
- `packages/cli`: the `wiki0` command
- `packages/mcp`: the `wiki0-mcp` server

## Development

```sh
pnpm install
pnpm verify
```

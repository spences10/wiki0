# @wiki0/cli

Command line interface for wiki0: search a project's docs and get the
right section with a `path:start-end` citation.

## Install

```sh
pnpm add -g @wiki0/cli
```

## Commands

```sh
wiki0 index                      # index the project docs
wiki0 status                     # index path and staleness
wiki0 search "query" [--limit 5] # one cited section per document
wiki0 show <target> [--tokens 2000] [--neighbours 1]
wiki0 context "query"            # top sections as cited Markdown
wiki0 lint                       # broken links and anchors
wiki0 graph                      # documents and links
wiki0 documents                  # outline and link counts per document
wiki0 backlinks <path-or-title>
```

`show` targets: `path:12`, `path:12-40`, `path#heading`, `path` or a
document title. When the text is longer than the token budget, the
output ends with the range to read next.

Every command takes `--root`; by default the project root is the
nearest folder with `.git` or `wiki0.toml`. `lint` exits with code 1
when it finds errors.

## Output

`show` and `context` print Markdown (`--json` for structured output).
The other commands print JSON.

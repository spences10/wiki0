# @wiki0/ui

Local docs browser for wiki0. Run it with `wiki0 ui` from
`@wiki0/cli`; it opens the project's docs in the browser, rendered,
with links between docs, search and index health.

## Use

```sh
npx @wiki0/cli ui            # print the URL and open the browser
npx @wiki0/cli ui --no-open  # only print the URL
npx @wiki0/cli ui --stop     # stop the server for this project
```

The URL, with its access token, is the first line printed. A second
run for the same project reuses the running server and prints the same
URL. When stdout is not a terminal, as when an agent runs it, the
server starts in the background and the command returns; `--detach`
and `--foreground` choose explicitly. A background server stops after
four hours without requests.

| Flag           | Default                                    |
| -------------- | ------------------------------------------ |
| `--root`       | nearest folder with `.git` or `wiki0.toml` |
| `--host`       | `127.0.0.1`                                |
| `--port`       | `4100` (`WIKI0_UI_PORT`); busy falls back  |
| `--no-open`    | opens a browser                            |
| `--detach`     | when stdout is not a terminal              |
| `--foreground` | when stdout is a terminal                  |
| `--stop`       |                                            |

The package also exposes a `wiki0-ui` binary with the same flags.

## What it shows

- **Docs:** each document rendered, with its outline, the documents
  linking to it, and a notice pointing superseded docs to their
  replacement. Links between docs, `#heading` anchors and
  `[[wikilinks]]` open inside the app; links wiki0 can't resolve show
  as broken with the reason.
- **Search:** `⌘K` from anywhere, or the search page with the score
  breakdown for each result. A result opens its section highlighted.
- **Health:** index status and reindex, chunk sizes, lint findings and
  the link graph.

## Security

- Binds to `127.0.0.1`; other hosts print a warning.
- Every API request needs the per-server token from the URL, and the
  Host header must be the address the server listens on.
- Read-only apart from reindexing, which writes only the index.
- A strict Content Security Policy: no inline scripts, frames, forms
  or `<base>`, so raw HTML in docs renders but can't run.
- Server state (port, pid, token) is kept in
  `$XDG_STATE_HOME/wiki0/ui/`, readable only by you.

## API

`start_ui_server`, `launch_ui` and `serve_ui` are exported for tools
that embed the server. Everything it serves comes from `@wiki0/core`.

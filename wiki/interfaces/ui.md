---
title: Docs browser
aliases: [wiki0 ui, '@wiki0/ui', local UI]
type: reference
---

# Docs browser

`@wiki0/ui`, started with `wiki0 ui`. Flags and security:
[the package README](../../packages/ui/README.md). Why it exists:
[0010](../decisions/0010-landing-page-and-local-ui.md).

- Built for an agent to hand a person the docs: `npx @wiki0/cli ui`
  prints the URL and returns when stdout is not a terminal, and a
  second run reuses the server for that project.
- Reads only through `@wiki0/core`. Rendering turns each link into
  core's resolved target (`list_links`) and each heading id into
  core's slug, so the UI never resolves a link itself.
- Writes nothing but the index (Reindex) and its own state file under
  `$XDG_STATE_HOME/wiki0/ui/`.
- A Node server in the package serves the built Svelte app and a
  token-protected JSON API on `127.0.0.1`.

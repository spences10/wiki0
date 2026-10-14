---
title: CLI
aliases: [wiki0 CLI, '@wiki0/cli']
type: reference
---

# CLI

`@wiki0/cli`, binary `wiki0`. Commands and flags are listed in
[the package README](../../packages/cli/README.md).

- `show` and `context` print Markdown; everything else prints JSON for
  scripts and agents.
- `lint` exits with code 1 when it finds errors, so it can gate CI.
- Every command is a thin wrapper over a `@wiki0/core` function.

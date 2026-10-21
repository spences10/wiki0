---
title: CLI
aliases: [wiki0 CLI, '@wiki0/cli']
type: reference
---

# CLI

`@wiki0/cli`, binary `wiki0`. Commands and flags are listed in
[the package README](../../packages/cli/README.md).

- `show`, `context` and `check` print Markdown; everything else prints
  JSON for scripts and agents.
- `lint` and `check` exit with code 1 when they find errors, so they
  can gate CI.
- Every command is a thin wrapper over a `@wiki0/core` function.

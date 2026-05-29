---
# prettier-ignore
name: wiki0-package-workflow
description: Build and validate wiki0 package changes. Trigger when editing packages/core, packages/cli, packages/mcp, or exposing behavior through CLI and MCP.
---

# wiki0 package workflow

Use this workflow for code changes in the core, CLI, or MCP packages.

## Package boundaries

- Put shared Markdown, frontmatter, page IO, indexing, and search
  behavior in `packages/core`.
- Expose agent-facing operations in `packages/mcp` after core support
  exists.
- Expose user command workflows in `packages/cli` after core support
  exists.
- Keep CLI and MCP thin; they should call core primitives.

## Validation

Run focused checks before reporting completion:

```sh
pnpm --filter @wiki0/core run test:self
pnpm --filter @wiki0/core run build:self
pnpm --filter @wiki0/cli run check:self
pnpm --filter @wiki0/mcp run check:self
pnpm --filter @wiki0/cli run build:self
pnpm --filter @wiki0/mcp run build:self
```

After editing TypeScript files, run LSP diagnostics on changed source
files.

## Dogfood check

When adding a CLI or MCP feature intended for wiki operations, use
that feature against this repository before finishing when safe.

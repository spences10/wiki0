---
# prettier-ignore
name: wiki0-package-workflow
description: Build and validate wiki0 package changes. Trigger when editing packages/core, packages/cli, packages/mcp, packages/ui, or exposing behavior through CLI, MCP and the docs UI.
---

# wiki0 package workflow

Use this workflow for code changes in the core, CLI, MCP or UI
packages.

## Package boundaries

- Put Markdown parsing, indexing, link resolution, search and lint in
  `packages/core`.
- Expose agent-facing operations in `packages/mcp` after core support
  exists.
- Expose user command workflows in `packages/cli` after core support
  exists.
- Keep CLI and MCP thin; they should call core primitives.
- `packages/ui` serves the local docs browser. It reads only through
  `@wiki0/core` exports and never parses or resolves links itself;
  ask for a core function when a view needs data core lacks.

## Validation

Run focused checks before reporting completion:

```sh
pnpm --filter @wiki0/core run test:self
pnpm --filter @wiki0/core run build:self
pnpm --filter @wiki0/cli run check:self
pnpm --filter @wiki0/mcp run check:self
pnpm --filter @wiki0/cli run build:self
pnpm --filter @wiki0/mcp run build:self
pnpm --filter @wiki0/ui run build:self
pnpm --filter @wiki0/ui run check:self
pnpm --filter @wiki0/ui run test:self
```

After editing TypeScript files, run LSP diagnostics on changed source
files.

## Dogfood check

When changing indexing, search or lint, run the CLI against this repo
and at least one other real repo before finishing, and check the
results are correct, not just present.

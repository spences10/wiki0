---
title: Publishing workflow
aliases:
  - npm publishing
  - package publishing
  - changesets publish
tags:
  - package
  - publishing
  - npm
  - changesets
---

# Publishing workflow

wiki0 uses Changesets to version and publish packages. The maintainer
writes changesets; agents propose the description.

## Package shape

- `@wiki0/core`: indexing, links, search and lint.
- `@wiki0/mcp`: the agent-facing MCP server ([[interfaces/mcp]]).
- `@wiki0/cli`: the `wiki0` binary for shells and CI
  ([[interfaces/cli]]).
- `apps/wiki0-web` is private and ignored by Changesets.

## Lessons from first npm publish

- `npm view <name>` only proves a package is unclaimed; it does not
  prove npm will accept publication.
- npm can reject an unscoped package name for similarity to an
  existing package. `wiki0` was rejected as too similar to `riki02`.
- Prefer scoped packages under the owned `@wiki0` organization when
  publishability matters.
- Changesets can partially publish a release: `@wiki0/core@0.0.1` and
  `@wiki0/mcp@0.0.1` published while `wiki0@0.0.1` failed.
- After a partial publish, reconcile package names, changelogs,
  versions, and tags before retrying.

## Validation expectations

Run `pnpm verify` before publishing; it includes a smoke test that
packs each package and runs both binaries.

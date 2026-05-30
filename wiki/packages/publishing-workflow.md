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

wiki0 uses [[Changesets]] to version and publish packages.

## Package shape

- `@wiki0/core` is the reusable library of Markdown wiki primitives.
- `@wiki0/mcp` is the agent-facing MCP server and primary LLM tool
  surface.
- `@wiki0/cli` is the shell, CI, and human fallback interface. It
  still exposes the `wiki0` binary.

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

Before publishing package changes, load [[wiki0 package workflow]] and
run the relevant focused checks from
`.agents/skills/wiki0-package-workflow/SKILL.md`.

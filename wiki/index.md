---
title: wiki0 docs
aliases: [home, docs index]
---

# wiki0 docs

wiki0 searches a project's existing docs and returns the right section
with a `path:start-end` citation, so coding agents read a section
instead of whole documents. It never calls an LLM and never writes to
the files it indexes.

## Reference

- [Indexing](reference/indexing.md): which files, chunks and
  frontmatter
- [Search and show](reference/search.md): ranking, relaxation and
  reading sections
- [Links and lint](reference/links-and-lint.md): link resolution and
  lint rules
- [Storage](reference/storage.md): where the index lives and how to
  configure it

## Interfaces

- [[interfaces/cli]]
- [[interfaces/mcp]]
- [[interfaces/ui]]

## Decisions

| #    | Decision                                                                       | Status     |
| ---- | ------------------------------------------------------------------------------ | ---------- |
| 0001 | [Docs are the source of truth](decisions/0001-docs-are-the-source-of-truth.md) | accepted   |
| 0002 | [Index in the project folder](decisions/0002-index-in-project-folder.md)       | superseded |
| 0003 | [Optional frontmatter](decisions/0003-optional-frontmatter.md)                 | accepted   |
| 0004 | [CLI serves the web UI](decisions/0004-cli-serves-web-ui.md)                   | superseded |
| 0005 | [Web app opens local folders](decisions/0005-web-app-opens-local-folders.md)   | superseded |
| 0006 | [Index in the user cache](decisions/0006-index-in-user-cache.md)               | accepted   |
| 0007 | [Read-only, no LLM calls](decisions/0007-read-only-no-llm.md)                  | accepted   |
| 0008 | [Lexical search, no embeddings](decisions/0008-lexical-search.md)              | accepted   |
| 0009 | [Resolve both link styles](decisions/0009-resolve-both-link-styles.md)         | accepted   |
| 0010 | [Landing page and local UI](decisions/0010-landing-page-and-local-ui.md)       | accepted   |

## Working on wiki0

- [[packages/publishing-workflow]]
- [Search quality log](dogfooding/search-quality.md)
- [Agent-written docs research](research/agent-written-docs.md)

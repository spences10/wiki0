---
title: Indexing
type: reference
---

# Indexing

`wiki0 index` rebuilds the index from the project files. Code:
`packages/core/src/indexer.ts`, `files.ts`, `chunks.ts`.

## Which files

- Inside a git repo, the file list comes from `git ls-files` (tracked
  and untracked, excluding ignored), so `.gitignore` applies exactly
  as git applies it. Outside git, wiki0 walks the folder.
- `.git`, `node_modules` and `.wiki0` are always skipped.
- Default include is `**/*.md`; set `include` and `exclude` in
  `wiki0.toml` to change it ([Storage](storage.md#config)).
  Dot-folders such as `.github/` are not matched by `**` unless
  included explicitly.
- `.txt`, `.pdf` and `.docx` are indexed when an include pattern
  matches them; their text is split into plain chunks.

## Chunks

A chunk is the unit search returns and `show` reads.

- Markdown splits at headings (headings inside code blocks are
  ignored). Each chunk keeps its breadcrumb (`title > h1 > h2`) and
  its exact line range in the file, counting frontmatter lines.
- A section too small to stand alone merges into its parent; a heading
  with no text of its own joins its first child; a very large section
  splits at paragraph or code-block boundaries, never inside a code
  block. Thresholds are in `chunks.ts`.
- The chunk text stored is the exact source lines, so a citation's
  text matches the file.

## Document metadata

From frontmatter when present
([0003](../decisions/0003-optional-frontmatter.md)): title, aliases,
tags, status, type, date, priority, supersedes, superseded_by. Invalid
YAML produces a warning in the `index` output and the file is still
indexed.

Most ADR templates write status in the body instead, so wiki0 also
reads header lines before the first `##` heading, and a `## Status`
section: `Status:`, `Superseded by:` / `Replaced by:`, and
`Supersedes:` / `Replaces:` / `Amends:` / `Amended by:`. References
resolve from links on that line, or from ADR numbers such as `ADR-12`
or `0005` that match a file in the same folder. Code:
`packages/core/src/lifecycle.ts`.

## Staleness

The index stores a SHA-256 of each file. `wiki0 status` compares them
with the current files and lists reasons: `missing-index`,
`schema-version-mismatch`, `new-pages`, `modified-pages`,
`deleted-pages`, `package-version-mismatch`. Search results carry a
warning while the index is stale.

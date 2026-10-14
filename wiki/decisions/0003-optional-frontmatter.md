---
title: Optional frontmatter
type: decision
status: accepted
date: 2026-05-30
---

# Optional frontmatter

## Decision

YAML frontmatter at the very start of a file is read when present and
never required. Plain Markdown with no frontmatter indexes and links
normally.

## Fields wiki0 reads

`title`, `aliases`, `tags`, `status`, `type`, `date`, `priority`,
`supersedes`, `superseded_by`. How each one affects ranking is in
[Search and show](../reference/search.md#ranking).

## Why

Most repos have no frontmatter, so wiki0 must work without it. Where
it exists, `status` and `supersedes` are the cheapest reliable signal
of which doc is current.

## Consequences

- Invalid YAML is a warning; the file is still indexed.
- Title falls back to the first `#` heading, then the file name.

---
title: Optional frontmatter
status: proposed
tags:
  - decision
  - metadata
  - frontmatter
---

# Optional frontmatter

Status: proposed

wiki0 should support YAML frontmatter as optional page metadata, but
plain Markdown pages and `[[WikiLinks]]` must continue to work without
it.

## Context

Obsidian treats top-of-file YAML frontmatter as Properties. Foam
supports top-of-file YAML frontmatter as Note Properties. In both
ecosystems, wikilinks are independent of frontmatter.

Frontmatter is not part of core Markdown, but it is a common
convention across PKM tools and static site generators.

## Decision

Support frontmatter only when it appears at the byte/start of the
Markdown file and is delimited by `---` fences.

Example:

```md
---
title: My Page
tags:
  - demo
aliases:
  - Old Name
---

# My Page

See [[other-page]].
```

Initial supported fields:

- `title`
- `alias` / `aliases`
- `tags`
- `created`
- `updated`

## Constraints

- Frontmatter is optional, never required.
- `[[WikiLinks]]` work in plain Markdown with no frontmatter.
- Page title should fall back in order: frontmatter `title`, first `#`
  heading, file/title fallback.
- Aliases should help resolve links, but should not replace canonical
  page paths.

## Links

- [[projects/building-wiki0]]
- [[topics/llm-wikis]]

## Implementation notes

Initial support has been added to [[packages/core]] and exposed
through the MCP `parse_markdown` tool. Page reads now return both raw
`body` and frontmatter-stripped `content`.

Wikilink parsing now ignores frontmatter and fenced code blocks, so
examples do not become graph edges.

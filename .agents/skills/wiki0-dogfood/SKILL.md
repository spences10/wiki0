---
# prettier-ignore
name: wiki0-dogfood
description: Use wiki0 itself before direct Markdown edits. Trigger when editing wiki docs, adding frontmatter, reading project memory, or updating dogfooding documentation.
---

# wiki0 dogfooding

When changing project memory in `wiki/`, use wiki0 interfaces first.

## Workflow

1. Prefer MCP tools for wiki page operations:
   - `read_page` before changing existing pages.
   - `set_page_frontmatter` for YAML metadata.
   - `append_page` for additive notes.
   - `create_page` for new docs.
2. Use the CLI when verifying the command-line path matters:
   - `node packages/cli/dist/index.js page frontmatter ...`
   - `node packages/cli/dist/index.js page read ...`
   - `node packages/cli/dist/index.js index --root .`
3. Only use direct file edits when the needed wiki0 interface is
   missing or broken.
4. If direct edits are necessary, say why and consider adding the
   missing CLI/MCP capability.

## Frontmatter conventions

Use frontmatter for dogfooding docs when useful:

```yaml
title: Page Title
aliases:
  - alternate name
tags:
  - package
  - interface
```

Keep wiki links in Markdown content, not frontmatter, unless
deliberately testing parser behavior.

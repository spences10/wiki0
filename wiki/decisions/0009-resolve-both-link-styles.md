---
title: Resolve both link styles
type: decision
status: accepted
date: 2026-10-14
---

# Resolve both link styles

## Decision

Index standard Markdown links (`[text](path.md#anchor)`) and
`[[wikilinks]]` into the same link graph. Never rewrite links in the
user's files.

## Why

- Most repos use standard links; Obsidian-style vaults use wikilinks.
- GitHub does not render `[[...]]`, so converting links would break
  docs where most people read them.
- Agents cite `path#anchor` and `path:line` instead of copying text,
  which only works if links and anchors resolve exactly.

## Consequences

Anchors follow GitHub's slugs so a citation matches what GitHub
renders. Rules: [Links and lint](../reference/links-and-lint.md).

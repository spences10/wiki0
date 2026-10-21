---
title: Check changed docs
type: decision
status: accepted
date: 2026-10-21
---

# Check changed docs

## Decision

`wiki0 check` (MCP `check_docs`) checks the docs an agent just changed
and reports problems with `path:line`. It still never writes to the
docs. Docs with a status such as `idea` or `planned` rank lower and
are labelled "not decided".

## Why

- Agents act on check output more reliably than on written guidance;
  context files gave no significant gain in task success
  ([research](../research/agent-written-docs.md)).
- Models add rather than cut, so a change that only adds lines is
  worth a second look.
- Rules that fire on ordinary prose get switched off, so every rule
  must give zero hits on clean docs.
- Something mentioned in passing was written up as a plan; a status
  that ranks lower and says "not decided" keeps it from reading as a
  decision.

## Consequences

- Only changed files are checked by default, so an existing repo's old
  issues don't bury the new ones.
- Rules can be turned off in `wiki0.toml`.
- Stale claims about what is built are not caught; that needs
  comparing docs with code.

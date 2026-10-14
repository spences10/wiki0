---
title: Read-only, no LLM calls
type: decision
status: accepted
date: 2026-10-14
---

# Read-only, no LLM calls

## Decision

wiki0 reads and indexes docs; it does not write pages, summaries or
facts, and it never calls an LLM. The agent using wiki0 does any
reasoning.

## Why

- Studies of agent-written context files found little or no gain in
  task success and around 20% more cost, with LLM-generated content
  the worst.
- Memories that an LLM keeps rewriting get better and then fall below
  having no memory; stale memory makes agents fail more often.
- The common failure in practice is a written page whose numbers,
  dates or quotes drift from the source while every structural check
  passes.

## Consequences

- Removed: page create/append/frontmatter tools, regex facts, events,
  topics, review queues, document sync and wiki planning.
- Writing can come back only with a benchmark showing it helps, and
  with gates: one-line claims citing a source file, verbatim checks of
  numbers and quotes, duplicate checks, and human review of the diff.

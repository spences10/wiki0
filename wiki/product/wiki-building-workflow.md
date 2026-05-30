---
title: Wiki building workflow
aliases:
  - build a wiki workflow
  - wiki bootstrap workflow
tags:
  - product
  - workflow
  - needs-review
---

# Wiki building workflow

wiki0 should give agents a deterministic workflow for building a wiki
from a source set. A codebase is one source type, but the workflow
should also support docs folders, research links, meeting notes,
existing Markdown, imported text, or any other user-provided knowledge
corpus.

## User intent

When a user says something like "make a wiki for this project" or
"turn these docs into a wiki", the agent should treat that as a
request to build a navigable, linked Markdown knowledge base using
wiki0 primitives.

## Current tool-only workflow

Using the tools available today, an agent should:

1. Clarify the source scope when needed: codebase, docs folder, URLs,
   notes, or selected files.
2. Inspect source material without writing pages yet.
3. Create a short plan with proposed top-level pages and naming
   conventions.
4. Create a wiki index page that explains the corpus and links to
   major sections.
5. Create focused pages for stable concepts, packages/modules,
   workflows, decisions, people, and open questions as appropriate for
   the corpus.
6. Use wikilinks between pages instead of duplicating context.
7. Use frontmatter for page title, aliases, tags, status, and review
   markers.
8. Add structured facts for durable claims, decisions, or constraints.
9. Run `index_wiki` after page creation.
10. Run `lint_wiki` and fix unresolved links or duplicate names.
11. Run `review_wiki` and surface pages still needing human review.

## What wiki0 should add

- A shipped MCP prompt/resource for this workflow so LLM clients can
  discover the recipe.
- A high-level `bootstrap_wiki` or `plan_wiki` tool that returns a
  proposed structure before writing.
- A CLI command such as `wiki0 bootstrap` for non-MCP users.
- Page templates for index, sources, concepts, workflows, decisions,
  package/module notes, and open questions.
- A version/capability tool so agents can tell which wiki0 workflow
  features are available.

## Principle

wiki0 should provide bricks and a blueprint. Low-level tools are
enough for power users, but agents need an explicit workflow to
produce consistent wikis.

## Implementation start

- Added a core `plan_wiki` primitive and
  `wiki_building_workflow_markdown` export so the workflow is
  available outside MCP.
- Added `wiki0 plan` for CLI users.
- Added MCP `plan_wiki`, `build_wiki` prompt, and
  `wiki0://workflows/wiki-building` resource so clients can discover
  the blueprint directly.
- Added tests, README notes, and a changeset for the new package
  surface.

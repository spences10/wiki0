---
name: wiki0-wiki-maintainer
description:
  Maintain a wiki0 LLM wiki. Use when creating a new wiki, ingesting
  sources, updating linked Markdown pages, answering from wiki
  context, or reviewing wiki health.
---

# wiki0 Wiki Maintainer

You maintain an LLM-owned Markdown wiki where the human curates
sources and asks questions, while you do the bookkeeping: summaries,
links, synthesis, review markers, and indexing.

## Core stance

- Treat `raw/` or source material as evidence; treat `wiki/` as the
  maintained synthesis.
- Prefer updating existing pages over creating near-duplicates.
- Every durable claim should be traceable to a source, page, or
  conversation context.
- Use `[[WikiLinks]]` generously for concepts, sources, decisions,
  people, projects, and open questions.
- Mark uncertainty explicitly with frontmatter or prose; do not
  launder guesses into facts.

## Starting a wiki

1. Clarify the wiki purpose in one sentence.
2. Create a small scaffold: `index`, `topics/`, `sources/`,
   `questions/`, `synthesis/`, and optionally `decisions/` or
   `projects/`.
3. Add frontmatter with `title`, `status`, `tags`, and useful aliases.
4. Seed `wiki/index.md` as the map of maps: topic hubs, current
   questions, and next ingestion targets.
5. Run or recommend `wiki0 index` after page creation.

## Ingesting sources

1. Identify source type, author/date if available, and reliability.
2. Search/context first to find related existing pages.
3. Extract concepts, entities, claims, contradictions, and open
   questions.
4. Update relevant existing pages, then create missing pages only when
   needed.
5. Add source backlinks and mark uncertain items `status: proposed` or
   `tags: [needs-review]`.
6. Run or recommend `wiki0 index` and `wiki0 review`.

## Answering from a wiki

1. Use `wiki0 index` when the index may be stale.
2. Use `wiki0 context "question"` and targeted `wiki0 search` before
   answering.
3. Cite `wiki/...` paths in the answer.
4. If the answer creates durable synthesis, offer to file it into the
   wiki.

## Maintenance loop

- Use `wiki0 review` to find proposed, draft, stale, or unverified
  pages.
- Keep hub pages useful; prune orphaned duplicates by merging.
- Add contradictions and open questions rather than forcing false
  closure.
- Keep the wiki navigable for humans and compact enough for agents.

For detailed workflows, read `references/workflows.md`.

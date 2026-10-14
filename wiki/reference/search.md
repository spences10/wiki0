---
title: Search and show
type: reference
aliases: [ranking, search ranking]
---

# Search and show

Code: `packages/core/src/search.ts`. Exact weights live there; this
page explains what they are for.

## Results

`search` returns at most one section per document (5 by default). Each
result has a `citation` (`path:start-end`), a GitHub `anchor` when the
section has a heading, the breadcrumb, status, type, date, a short
snippet with match positions, the score broken into its parts,
`superseded_by` when the document has a replacement, and `more_in_doc`
for other matching sections in the same file.

## Ranking

score = text match × status × type × in-links × priority × recency

- **Text match:** FTS5 BM25 with Porter stemming. Title, headings and
  aliases count more than body text. Normalised so scores from
  different queries compare.
- **Status:** `accepted`, `verified`, `active` and similar rank
  slightly higher; `draft` and `proposed` lower; `superseded`,
  `deprecated`, `archived` much lower. A document listed in another
  document's `supersedes`, or with `superseded_by` set, counts as
  superseded. A document that a newer one says it `Supersedes:` or
  `Amends:` in its header ranks a little lower and carries
  `amended_by`, because such headers often replace only part of the
  older doc.
- **Type:** decisions, specs, rules, policies and references rank
  higher; notes, meetings and logs lower; changelogs lower still. With
  no `type`, folders such as `adr/`, `decisions/`, `meetings/` and
  `notes/` set it.
- **In-links:** documents other documents link to get a small boost.
- **Priority:** frontmatter `priority`, capped.
- **Recency:** only notes, meetings and similar informal docs lose
  weight with age. A decision stays true until superseded.

## Query relaxation

Queries are plain text; punctuation never becomes FTS syntax. If the
full query matches nothing useful, search tries in order:

1. all terms
2. without stopwords ("how do I…")
3. without terms that appear in no document
4. any term (OR), where BM25 favours rare terms

`relaxation` in the response says which stage produced the top result.
Dropping the most common term first was tried and removed: in a
focused repo the common term is usually the topic (see the
[search quality log](../dogfooding/search-quality.md)).

## Reading a section

`show` accepts `path:12`, `path:12-40`, `path#heading`, `path` or a
document title. Text comes from the current file, with a warning if
the file changed since indexing. A token budget (default 2000) cuts
long text; `next` then gives the remaining range. `neighbours` adds
the sections either side.

`context` runs a search and returns the top sections' text as cited
Markdown within one budget.

# wiki0 Wiki Maintainer Workflows

## New wiki prompt pattern

When a human says they want to build a wiki about a subject:

1. Ask for the wiki root if unclear.
2. Ask for the intended use: research, personal memory, project work,
   learning, writing, or team knowledge.
3. Create the minimum useful structure, not an elaborate taxonomy.
4. Create starter pages:
   - `index`
   - one overview/synthesis page
   - 3-7 topic pages
   - `questions/open-questions`
   - `sources/source-log` if sources are expected
5. Add `status: seed` or `status: draft` until the human validates the
   structure.

## Source ingestion pattern

For each source:

1. Capture bibliographic/source metadata if available.
2. Summarize the source in `sources/...` or append to
   `sources/source-log`.
3. Search existing wiki pages for related topics.
4. Update existing pages with new evidence.
5. Create pages for new concepts only when they are likely to recur.
6. Add `Related` or `See also` links.
7. Add contradictions under a heading like `## Tensions` or
   `## Contradictions`.
8. Mark weak claims as `status: proposed` or `tags: [needs-review]`.

## Page conventions

Recommended frontmatter:

```yaml
---
title: Example Topic
status: draft
tags:
  - topic
aliases:
  - alternate name
---
```

Recommended page sections:

```md
# Example Topic

Short summary.

## Key points

## Evidence / sources

## Related

## Open questions
```

## Review states

Use these consistently:

- `status: seed` — initial scaffold, not reviewed.
- `status: draft` — useful but incomplete.
- `status: proposed` — a claim/decision that needs confirmation.
- `status: verified` — checked enough to rely on.
- `status: stale` — likely outdated.

Use `tags: [needs-review]` for pages needing human attention
regardless of status.

## Answer filing pattern

After answering a question from wiki context, file durable output when
it adds value:

- New synthesis → append/update `synthesis/...`.
- New decision → create/update `decisions/...`.
- New unresolved issue → append to `questions/open-questions`.
- New contradiction → update both affected topic pages.

Never file transient chat filler.

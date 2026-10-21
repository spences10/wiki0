---
title: Links and lint
type: reference
aliases: [link resolution, lint rules]
---

# Links and lint

Code: `packages/core/src/links.ts`, `lint.ts`, `check.ts`. Why both
link styles: [0009](../decisions/0009-resolve-both-link-styles.md).
Why `check`: [0011](../decisions/0011-check-changed-docs.md).

## What counts as a link

Markdown links, reference links, images, HTML `<a href>` and
`<img src>`, `[[wikilinks]]` (with `|alias` and `#heading`),
`![[embeds]]`, and wikilinks inside frontmatter values. Anything in
code blocks or code spans is ignored. External URLs are not stored.

## Resolution

- **Paths:** relative to the linking file; a leading `/` means the
  repo root. A missing `.md` extension is tried; a folder resolves to
  its `README.md` or `index.md`. A match that only works when case is
  ignored resolves but is flagged.
- **Site routes:** a root-relative link with no extension that matches
  no file, such as `/contact`, is treated as a website route, not a
  missing file.
- **Wikilinks:** exact path, then a unique path ending, then title or
  alias. Several matches is ambiguous: wiki0 picks the same folder,
  then the shortest path, and reports the candidates.
- **Fragments:** GitHub heading slugs (including `-1`, `-2` for
  repeated headings), then case-insensitive, then raw heading text;
  also HTML `id`/`name`, `^block-id` and line ranges like `#L10-L20`.

## Lint rules

| Rule                     | Severity | Meaning                                       |
| ------------------------ | -------- | --------------------------------------------- |
| `missing-file`           | error    | target file does not exist                    |
| `embed-target-missing`   | error    | image or embed target does not exist          |
| `missing-heading`        | error    | anchor not found; suggestions given           |
| `missing-block-id`       | error    | `^id` not found                               |
| `line-out-of-range`      | error    | line fragment past the end of the file        |
| `link-outside-root`      | error    | path leaves the project                       |
| `ambiguous-wikilink`     | warning  | several documents match                       |
| `undefined-reference`    | warning  | `[text][ref]` with no definition              |
| `case-mismatch`          | warning  | breaks on case-sensitive systems              |
| `duplicate-name`         | info     | title or alias used by more than one document |
| `orphan-page`            | info     | nothing links to the document                 |
| `fragment-non-canonical` | info     | anchor matched by text, not its GitHub slug   |

Info findings never fail `wiki0 lint`; most repos have many unlinked
docs, and noisy rules teach agents to ignore lint.

## Check rules

`wiki0 check` re-indexes, then reports the lint rules above plus these
for Markdown changed since `HEAD` (or the paths given, or `--all`).
Turn a rule off in `wiki0.toml`: `[check]` `disable = ["net-growth"]`.

| Rule                  | Severity | Meaning                                                                       |
| --------------------- | -------- | ----------------------------------------------------------------------------- |
| `unresolved-id`       | error    | an ID such as `Decision 0012` or `ADR-012` matches no document                |
| `unlinked-id`         | warning  | an ID matches a document but the line does not link to it                     |
| `overlapping-section` | warning  | 60% or more of a section's 3-word phrases appear in a section of another file |
| `net-growth`          | info     | the change only adds lines (10 or more), or adds a new document               |

- IDs come from the repo's own numbered file names:
  `decisions/0004-x.md` makes `Decision 4` and `decisions 0004` IDs;
  `ADR-012-x.md` makes `ADR-012`. Repos without numbered files get no
  ID checks.
- Sections under 200 characters and changelogs are not compared.
- Not checked: wording, length or style. Those rules were too noisy in
  every tool reviewed ([research](../research/agent-written-docs.md)).
  Numbers without a source were tried and dropped: spec values such as
  "10 MB a file" are their own source.

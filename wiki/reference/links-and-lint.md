---
title: Links and lint
type: reference
aliases: [link resolution, lint rules]
---

# Links and lint

Code: `packages/core/src/links.ts`, `lint.ts`. Why both link styles:
[0009](../decisions/0009-resolve-both-link-styles.md).

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

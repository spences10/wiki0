---
title: Search quality log
type: notes
date: 2026-10-14
---

# Search quality log

Queries run against real repos while building search, and what each
result led to. Use these as starting cases for the benchmark.

| Repo            | Query                          | Expected top result                                 | Outcome                                                                                                                   |
| --------------- | ------------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| sveltest        | how do I test remote functions | `apps/website/src/copy/remote-functions-testing.md` | Missed until hyphens split tokens and "I" became a stopword                                                               |
| sveltest        | vitest browser mode setup      | component testing setup section                     | Was strict-mode sections while relaxation dropped the most common term ("vitest"); fixed by dropping only unmatched terms |
| my-pi           | how do I release a package     | `docs/releases.md`                                  | Correct                                                                                                                   |
| scottspence.com | sqlite corruption copyfile     | `posts/sqlite-corruption-fs-copyfile-issue.md`      | Correct                                                                                                                   |
| wiki0           | where is the index stored      | [Storage](../reference/storage.md)                  | Returned old design pages until these docs were rewritten                                                                 |

## Lint on real repos

Before fixes, lint reported false errors for website routes such as
`/contact`, for links into dot-folders, and for every `CHANGELOG`
sharing a title. After fixes, scottspence.com had four errors and all
four were real broken links.

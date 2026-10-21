---
# prettier-ignore
name: wiki0
description: Find and write project docs with wiki0. Use when answering questions from the project's Markdown docs, or before and after adding or editing docs.
---

# wiki0

## Finding information

1. `npx @wiki0/cli search "<question>"`: one cited section per doc.
2. `npx @wiki0/cli show <citation>` to read it. Read the whole file
   only when the section is not enough.
3. A result with `status_note` ("idea, not decided") is not a
   decision. Don't act on it as one.

## Before writing

- Search first. If a section already covers the topic, edit that
  section; don't add a new one or a new doc.
- Before saying something is or isn't built, check the code.

## Writing

- Decide what a reader needs that the code can't tell them. Keep that.
  Delete everything else, including existing text that is now wrong or
  repeated.
- Give a source for every number, date, quote and claim: a file and
  line, a commit, or a link. To find it, look in the code and git
  history, then `wiki0 search`, then session history with
  `npx omnirecall` if it is installed. Only the user's messages and
  tool output count as a source, never an assistant's text.
- Keep the source's strength. Something the user mentioned in passing
  goes in with `status: idea` (or `research`, `planned`,
  `backburner`), never as a plan or a decision. Only a decision the
  user states is a decision.
- Name things in full. Link an ID such as a decision number to its
  doc.

## After writing

1. `npx @wiki0/cli check` and fix every error.
2. For warnings and notices, change only what each one points at.
   Don't rewrite the doc.

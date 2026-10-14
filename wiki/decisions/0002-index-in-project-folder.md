---
title: Index in the project folder
type: decision
status: superseded
superseded_by: wiki/decisions/0006-index-in-user-cache.md
date: 2026-05-31
---

# Index in the project folder

## Decision

Store the index at `.wiki0/wiki0.sqlite` in the project root, and have
`wiki0 init` add `.wiki0/` to the project's `.gitignore`.

## Why it was replaced

Running wiki0 on someone else's repo created a folder and edited their
`.gitignore`. Replaced by [[decisions/0006-index-in-user-cache]].

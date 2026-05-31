---
title: Document ingestion
tags:
  - product
  - ingestion
  - planning
status: draft
---

# Document ingestion

wiki0 should turn messy project source material into durable,
inspectable wiki memory.

## Working assumptions

- Markdown/wiki pages are the source of truth.
- SQLite is a rebuildable index/cache for finding existing
  information: chunks, search, backlinks, graph data, and derived
  metadata.
- Ingestion should write useful Markdown artifacts first, then rebuild
  the index.
- Structured facts should be reconstructable from Markdown source
  material or promoted into Markdown before being indexed.
- Bootstrap is one-time scaffolding; ongoing ingestion/sync is a
  separate workflow.

## First milestone: document parsing

Add a core document extraction layer that can return normalized text
from source files before wiki page creation.

Initial supported inputs:

- `.md` / `.markdown` as direct text.
- `.txt` as direct text.
- `.pdf` via a parser dependency.
- `.docx` via a parser dependency.

The parser should produce a stable result shape:

```ts
interface ParsedDocument {
	source_path: string;
	kind: 'markdown' | 'text' | 'pdf' | 'docx' | 'unsupported';
	title?: string;
	text: string;
	metadata: Record<string, string | number | boolean | null>;
	warnings: string[];
}
```

## Proposed package shape

- `packages/core/src/documents.ts`: source type detection and text
  extraction.
- `packages/core/src/documents.test.ts`: fixtures for markdown, text,
  pdf, docx, unsupported, empty, and missing files.
- `packages/core/src/index.ts`: export parsing primitives.
- Later: `wiki0 ingest` CLI and MCP `ingest_sources` should call the
  core layer.

## Acceptance criteria

1. Core can parse `.md`, `.txt`, `.pdf`, and `.docx` into normalized
   text.
2. Unsupported or failed files return typed warnings/errors without
   crashing batch ingestion.
3. Parser output is deterministic enough for tests.
4. No parsed facts are stored only in SQLite; durable extracted
   knowledge must be represented in Markdown before indexing.
5. Existing `bootstrap --ingest_sources` can be refactored to use this
   parser after the parser exists.

## Follow-up milestones

1. Add recursive source discovery for a docs folder.
2. Add `wiki0 ingest <path>` / MCP equivalent for recurring sync.
3. Track source fingerprints in Markdown frontmatter or source pages
   to detect changed/new documents.
4. Generate source pages or proposed wiki pages from parsed text.
5. Rebuild the SQLite index after ingestion.

## Related pages

- [[decisions/local-first-storage]]
- [[product/wiki-building-workflow]]
- [[dogfooding/tool-improvements]]

# @wiki0/core

Core wiki0 primitives for local-first Markdown wiki memory.

## What it provides

- Markdown and frontmatter parsing.
- Obsidian-style `[[WikiLinks]]` parsing.
- Page create/read/append/frontmatter operations.
- SQLite indexing and FTS search.
- Chunk-level context snippets with `wiki/path.md:line-line`
  citations.
- Direct indexed chunk lookup for known `path:line` targets.
- Backlinks, graph data, lint results, review queues, and structured
  facts.
- Wiki-building workflow planning for agents that need a deterministic
  source-to-wiki recipe.

## Basic usage

```ts
import {
	bootstrap_wiki,
	create_page,
	index_status,
	index_wiki,
	search_wiki,
	get_wiki_context,
	lint_wiki,
	plan_wiki,
} from '@wiki0/core';

create_page('projects/wiki0', 'Local-first [[topics/memory]].', {
	root: '.',
});
index_wiki('.');
console.log(index_status('.'));
console.log(search_wiki('memory', '.', 10));
console.log(get_wiki_context('what is wiki0?', '.', 5).markdown);
console.log(lint_wiki('.'));
console.log(
	plan_wiki({ sourceType: 'codebase', scope: 'current repo' }),
);
console.log(
	bootstrap_wiki({
		root: '.',
		sourceType: 'docs',
		sources: ['docs/guide.md'],
		ingestSources: true,
	}),
);
```

## Storage model

Markdown files under `wiki/` are canonical. The `.wiki0/wiki0.sqlite`
database is a rebuildable cache for search, backlinks, graph data, and
facts. `index_status` reports indexed-at time, schema/package
versions, and stale reasons when Markdown or index metadata has
changed since the last rebuild.

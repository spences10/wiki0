# @wiki0/core

Indexing, link resolution, search and lint for wiki0. The CLI and MCP
server are thin wrappers over these functions.

## Usage

```ts
import {
	index_wiki,
	index_status,
	lint_wiki,
	search,
	show,
} from '@wiki0/core';

await index_wiki('.');

const { results } = search('how do deploys work', '.');
// results[0].citation === 'docs/deploys.md:12-40'

const section = show(results[0].citation, '.', {
	token_budget: 1500,
});
```

## Functions

| Function                   | Returns                                                        |
| -------------------------- | -------------------------------------------------------------- |
| `index_wiki(root)`         | Rebuilds the index from the project files (async)              |
| `index_status(root)`       | Index path, staleness and reasons                              |
| `search(query, root, o)`   | One ranked, cited section per document                         |
| `show(target, root, o)`    | Current file text for a citation, line, heading, path or title |
| `get_wiki_context(q, r)`   | Search plus section text as Markdown                           |
| `lint_wiki(root)`          | Link problems with rule ids, severity and `path:line`          |
| `graph_wiki(root)`         | Documents and resolved/unresolved links                        |
| `list_documents(root)`     | Outline, metadata and link counts per document                 |
| `backlinks_for_page(t, r)` | Documents linking to a document                                |
| `resolve_index(root)`      | Where the index file lives                                     |

Reading functions open the index read-only and throw if it is missing;
run `index_wiki` first.

## Storage

The index is a rebuildable cache; a schema change rebuilds it.
`resolve_index` returns its path: `WIKI0_INDEX` if set,
`.wiki0/index.db` when `wiki0.toml` sets `[index] location = "local"`,
otherwise `~/.cache/wiki0/<project>-<hash>/index.db`
(`WIKI0_CACHE_DIR` overrides the base folder).

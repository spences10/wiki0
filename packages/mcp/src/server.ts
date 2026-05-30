import { ValibotJsonSchemaAdapter } from '@tmcp/adapter-valibot';
import { McpServer } from 'tmcp';
import { wiki0_info } from './info.js';
import { register_wiki_tools } from './tools.js';
import { register_wiki_workflow } from './workflow.js';

export function create_mcp_server(): McpServer {
	const info = wiki0_info();
	const server = new McpServer(
		{
			name: 'wiki0',
			version: info.version,
			description:
				'Local-first Markdown wiki memory for humans and agents',
		},
		{
			adapter: new ValibotJsonSchemaAdapter(),
			capabilities: {
				tools: { listChanged: true },
				prompts: { listChanged: true },
				resources: { listChanged: true },
			},
		},
	);

	register_wiki_tools(server);
	register_wiki_workflow(server);
	return server;
}

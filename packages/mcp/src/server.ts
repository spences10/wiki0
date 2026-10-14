import { ValibotJsonSchemaAdapter } from '@tmcp/adapter-valibot';
import { McpServer } from 'tmcp';
import { wiki0_info } from './info.js';
import { register_wiki_tools } from './tools.js';

export function create_mcp_server(): McpServer {
	const info = wiki0_info();
	const server = new McpServer(
		{
			name: 'wiki0',
			version: info.version,
			description:
				'Search a project’s docs and get the right section with a path:line citation',
		},
		{
			adapter: new ValibotJsonSchemaAdapter(),
			capabilities: {
				tools: { listChanged: true },
			},
		},
	);

	register_wiki_tools(server);
	return server;
}

import { ValibotJsonSchemaAdapter } from '@tmcp/adapter-valibot';
import { McpServer } from 'tmcp';
import { register_wiki_tools } from './tools.js';

export function create_mcp_server(): McpServer {
	const server = new McpServer(
		{
			name: 'wiki0',
			version: '0.0.0',
			description:
				'Local-first Markdown wiki memory for humans and agents',
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

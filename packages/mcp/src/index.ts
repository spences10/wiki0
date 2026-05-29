#!/usr/bin/env node

import { StdioTransport } from '@tmcp/transport-stdio';
import { create_mcp_server } from './server.js';

const transport = new StdioTransport(create_mcp_server());
transport.listen();
console.error('wiki0 MCP server running on stdio');

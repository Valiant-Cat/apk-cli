#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createApkCliMcpServer } from './mcp/server.js';

async function main() {
  const server = createApkCliMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('MCP server error:', error);
  process.exit(1);
});

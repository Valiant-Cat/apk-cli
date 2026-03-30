import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { runCli } from '../helpers/run-cli';

const MCP_TIMEOUT_MS = 60000;

type McpState = {
  pid: number;
  host: string;
  port: number;
  url: string;
  startedAt: string;
};

async function readStateFile(path: string): Promise<McpState> {
  return JSON.parse(await readFile(path, 'utf8')) as McpState;
}

describe('mcp management commands', () => {
  it('starts, reports status, serves tools, and stops the managed mcp server', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'apk-cli-manage-'));
    const stateFile = join(tempDir, 'server.json');

    try {
      const startResult = await runCli([
        'mcp',
        'start',
        '--host',
        '127.0.0.1',
        '--port',
        '0',
        '--state-file',
        stateFile
      ]);

      expect(startResult.exitCode).toBe(0);
      expect(startResult.stderr).toBe('');
      expect(startResult.stdout).toContain('running: yes');

      const state = await readStateFile(stateFile);
      expect(state.pid).toBeGreaterThan(0);
      expect(state.port).toBeGreaterThan(0);
      expect(state.url).toContain('/mcp');

      const statusResult = await runCli([
        'mcp',
        'status',
        '--state-file',
        stateFile
      ]);

      expect(statusResult.exitCode).toBe(0);
      expect(statusResult.stdout).toContain('running: yes');
      expect(statusResult.stdout).toContain(`pid: ${state.pid}`);
      expect(statusResult.stdout).toContain(`url: ${state.url}`);

      const transport = new StreamableHTTPClientTransport(new URL(state.url));
      const client = new Client({ name: 'apk-cli-http-test', version: '0.1.0' });
      await client.connect(transport);
      try {
        const tools = await client.listTools();
        expect(tools.tools.map((tool) => tool.name)).toEqual(['doctor', 'inspect', 'edit']);

        const doctorResult = await client.callTool({ name: 'doctor', arguments: {} });
        const doctorOutput = doctorResult.structuredContent as { tools: Array<{ name: string; status: string }> };
        expect(doctorOutput.tools.some((tool) => tool.name === 'apktool')).toBe(true);
      } finally {
        await client.close();
      }

      const stopResult = await runCli([
        'mcp',
        'stop',
        '--state-file',
        stateFile
      ]);

      expect(stopResult.exitCode).toBe(0);
      expect(stopResult.stdout).toContain('stopped: yes');

      const stoppedStatus = await runCli([
        'mcp',
        'status',
        '--state-file',
        stateFile
      ]);

      expect(stoppedStatus.exitCode).toBe(0);
      expect(stoppedStatus.stdout).toContain('running: no');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }, MCP_TIMEOUT_MS);
});

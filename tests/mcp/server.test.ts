import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const mcpEntryPath = resolve(rootDir, 'dist/mcp.js');
const MCP_TIMEOUT_MS = 60000;

async function createClient() {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [mcpEntryPath],
    cwd: rootDir,
    env: {
      ...process.env,
      NODE_NO_WARNINGS: '1'
    },
    stderr: 'pipe'
  });
  const client = new Client({
    name: 'apk-cli-mcp-test',
    version: '0.1.0'
  });

  await client.connect(transport);

  return {
    client,
    close: async () => {
      await client.close();
    }
  };
}

describe('apk-cli mcp server', () => {
  it('registers doctor inspect and edit tools', async () => {
    const { client, close } = await createClient();

    try {
      const result = await client.listTools();
      expect(result.tools.map((tool) => tool.name)).toEqual(['doctor', 'inspect', 'edit']);
    } finally {
      await close();
    }
  }, MCP_TIMEOUT_MS);

  it('returns structured output from the doctor tool', async () => {
    const { client, close } = await createClient();

    try {
      await client.listTools();
      const result = await client.callTool({ name: 'doctor', arguments: {} });
      const output = result.structuredContent as { tools: Array<{ name: string; status: string }> };

      expect(output.tools.some((tool) => tool.name === 'apktool')).toBe(true);
      expect(result.content[0]).toMatchObject({ type: 'text' });
    } finally {
      await close();
    }
  }, MCP_TIMEOUT_MS);

  it('returns structured output from the inspect tool', async () => {
    const { client, close } = await createClient();

    try {
      await client.listTools();
      const result = await client.callTool({
        name: 'inspect',
        arguments: {
          input: 'tests/fixtures/minimal-apk/app.apk'
        }
      });
      const output = result.structuredContent as {
        packageName: string;
        versionName: string;
        versionCode: string;
        labelRefs: string[];
        iconRefs: string[];
      };

      expect(output.packageName).toBe('com.example.demo');
      expect(output.versionName).toBe('1.2.3');
      expect(output.versionCode).toBe('42');
      expect(output.iconRefs).toContain('@mipmap/ic_launcher');
    } finally {
      await close();
    }
  }, MCP_TIMEOUT_MS);

  it('returns structured output from the edit tool', async () => {
    const outputDir = await mkdtemp(join(tmpdir(), 'apk-cli-mcp-edit-'));
    const outputFile = join(outputDir, 'edited.apk');
    const { client, close } = await createClient();

    try {
      await client.listTools();
      const result = await client.callTool({
        name: 'edit',
        arguments: {
          input: 'tests/fixtures/minimal-apk/app.apk',
          output: outputFile,
          appName: 'Mcp Edited',
          keystore: 'tests/fixtures/keystore/debug.jks',
          storePass: 'android',
          keyAlias: 'debug',
          keyPass: 'android'
        }
      });
      const output = result.structuredContent as {
        outputFile: string;
        stages: Array<{ name: string; status: string }>;
        verify: {
          packageName: string;
          labelRefs: string[];
        };
      };

      expect(output.outputFile).toBe(outputFile);
      expect(output.stages.map((stage) => stage.name)).toEqual(['decode', 'mutate', 'build', 'sign', 'verify']);
      expect(output.verify.packageName).toBe('com.example.demo');
      expect((await stat(outputFile)).isFile()).toBe(true);
      expect(result.content[0]).toMatchObject({ type: 'text' });
    } finally {
      await close();
      await rm(outputDir, { recursive: true, force: true });
    }
  }, MCP_TIMEOUT_MS);
});

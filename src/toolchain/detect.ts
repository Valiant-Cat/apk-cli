import { runCommand } from './runner.js';
import type { ToolDetection, ToolSpec } from './contracts.js';

const DEFAULT_PROBE_ARGS = ['--version'];

export async function detectTool(tool: ToolSpec): Promise<ToolDetection> {
  const probeArgs = tool.probeArgs ?? DEFAULT_PROBE_ARGS;

  try {
    await runCommand(tool.command, probeArgs);
    return { name: tool.name, status: 'available' };
  } catch {
    return { name: tool.name, status: 'missing' };
  }
}

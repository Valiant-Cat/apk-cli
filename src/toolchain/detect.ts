import { runCommand } from './runner.js';
import type { ToolDetection, ToolSpec } from './contracts.js';

export async function detectTool(tool: ToolSpec): Promise<ToolDetection> {
  try {
    await runCommand(tool.command, ['--version']);
    return { name: tool.name, status: 'available' };
  } catch {
    return { name: tool.name, status: 'missing' };
  }
}

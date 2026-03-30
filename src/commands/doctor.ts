import type { DoctorReport, ToolSpec } from '../toolchain/contracts.js';
import { detectTool } from '../toolchain/detect.js';

const DEFAULT_TOOLS: ToolSpec[] = [{ name: 'apktool', command: 'apktool' }];

export async function runDoctorCommand(options?: { json?: boolean }): Promise<void> {
  const tools = await Promise.all(DEFAULT_TOOLS.map((tool) => detectTool(tool)));
  const report: DoctorReport = { tools };

  if (options?.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  for (const tool of report.tools) {
    process.stdout.write(`${tool.name}: ${tool.status}\n`);
  }
}

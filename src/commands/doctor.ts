import type { DoctorReport, ToolSpec } from '../toolchain/contracts.js';
import { detectTool } from '../toolchain/detect.js';
import { formatJsonReport } from '../reporting/json-report.js';
import { formatTextReport } from '../reporting/text-report.js';

const DEFAULT_TOOLS: ToolSpec[] = [{ name: 'apktool', command: 'apktool' }];

export async function collectDoctorReport(
  tools: ToolSpec[] = DEFAULT_TOOLS,
  detector: typeof detectTool = detectTool
): Promise<DoctorReport> {
  return {
    tools: await Promise.all(tools.map((tool) => detector(tool)))
  };
}

export function renderDoctorReport(report: DoctorReport, json = false): string {
  if (json) {
    return `${JSON.stringify(report, null, 2)}\n`;
  }

  return `${report.tools.map((tool) => `${tool.name}: ${tool.status}`).join('\n')}\n`;
}

export async function runDoctorCommand(options?: { json?: boolean }): Promise<void> {
  const report = await collectDoctorReport();
  const output = options?.json === true
    ? formatJsonReport({ command: 'doctor', tools: report.tools })
    : formatTextReport({ command: 'doctor', tools: report.tools });

  process.stdout.write(output);
}

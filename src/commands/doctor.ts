import type { DoctorReport, ToolSpec } from '../toolchain/contracts.js';
import { formatJsonReport } from '../reporting/json-report.js';
import { formatTextReport } from '../reporting/text-report.js';
import { detectTool } from '../toolchain/detect.js';
import { ensureManagedToolchain } from '../toolchain/download.js';

const DEFAULT_TOOLS: ToolSpec[] = [
  { name: 'java', command: 'java' },
  { name: 'jarsigner', command: 'jarsigner' }
];

export async function collectDoctorReport(
  tools: ToolSpec[] = DEFAULT_TOOLS,
  detector: typeof detectTool = detectTool
): Promise<DoctorReport> {
  const baseTools = await Promise.all(tools.map((tool) => detector(tool)));

  try {
    await ensureManagedToolchain();
    return {
      tools: [
        ...baseTools,
        { name: 'apktool', status: 'available' },
        { name: 'bundletool', status: 'available' },
        { name: 'aapt2', status: 'available' },
        { name: 'zipalign', status: 'available' },
        { name: 'apksigner', status: 'available' },
        { name: 'android.jar', status: 'available' }
      ]
    };
  } catch {
    return {
      tools: [
        ...baseTools,
        { name: 'apktool', status: 'missing' },
        { name: 'bundletool', status: 'missing' },
        { name: 'aapt2', status: 'missing' },
        { name: 'zipalign', status: 'missing' },
        { name: 'apksigner', status: 'missing' },
        { name: 'android.jar', status: 'missing' }
      ]
    };
  }
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

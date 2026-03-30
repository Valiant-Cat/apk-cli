import { inspectPackage } from '../package/inspect.js';
import { formatJsonReport } from '../reporting/json-report.js';
import { formatTextReport } from '../reporting/text-report.js';

export async function runInspectCommand(input: string, options?: { json?: boolean }): Promise<void> {
  try {
    const report = await inspectPackage(input);
    const output = options?.json === true
      ? formatJsonReport({ command: 'inspect', index: report })
      : formatTextReport({ command: 'inspect', index: report });

    process.stdout.write(output);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}

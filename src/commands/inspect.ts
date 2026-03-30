import { inspectPackage, renderInspectReport } from '../package/inspect.js';

export async function runInspectCommand(input: string, options?: { json?: boolean }): Promise<void> {
  try {
    const report = await inspectPackage(input);
    process.stdout.write(renderInspectReport(report, options?.json === true));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}

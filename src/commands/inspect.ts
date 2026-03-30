import { inspectPackage, renderInspectReport } from '../package/inspect.js';

export async function runInspectCommand(input: string, options?: { json?: boolean }): Promise<void> {
  const report = await inspectPackage(input);
  process.stdout.write(renderInspectReport(report, options?.json === true));
}

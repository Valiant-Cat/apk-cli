import { installPackage, type InstallOptions } from '../package/install.js';
import { formatJsonReport } from '../reporting/json-report.js';
import { formatTextReport } from '../reporting/text-report.js';

export type InstallCommandOptions = InstallOptions & {
  json?: boolean;
};

export async function executeInstallCommand(input: string, options?: InstallCommandOptions) {
  return await installPackage(input, {
    serial: options?.serial,
    replace: options?.replace,
    grant: options?.grant
  });
}

export async function runInstallCommand(input: string, options?: InstallCommandOptions): Promise<void> {
  try {
    const report = await executeInstallCommand(input, options);
    process.stdout.write(options?.json === true ? formatJsonReport(report) : formatTextReport(report));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}

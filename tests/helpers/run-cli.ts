import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

type CliResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export async function runCli(args: string[]): Promise<CliResult> {
  const rootDir = resolve(fileURLToPath(new URL('../..', import.meta.url)));
  const cliPath = resolve(rootDir, 'src/cli.ts');

  return await new Promise<CliResult>((resolvePromise, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', cliPath, ...args], {
      cwd: rootDir,
      env: {
        ...process.env,
        NODE_NO_WARNINGS: '1'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.once('error', reject);
    child.once('close', (code) => {
      resolvePromise({
        exitCode: code ?? 1,
        stdout,
        stderr
      });
    });
  });
}

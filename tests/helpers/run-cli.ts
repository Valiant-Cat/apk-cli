import { spawn, execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

type CliResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

type RunCliOptions = {
  env?: NodeJS.ProcessEnv;
  cwd?: string;
};

const execFileAsync = promisify(execFile);
const rootDir = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const distCliPath = resolve(rootDir, 'dist/cli.js');

function runProcess(command: string, args: string[], cwd: string, env?: NodeJS.ProcessEnv): Promise<CliResult> {
  return new Promise<CliResult>((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        ...env,
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

export async function runCli(args: string[], options?: RunCliOptions): Promise<CliResult> {
  return await runProcess(process.execPath, [distCliPath, ...args], options?.cwd ?? rootDir, options?.env);
}

export async function runPackagedCli(args: string[], options?: RunCliOptions): Promise<CliResult> {
  const packResult = await execFileAsync('npm', ['pack', '--quiet'], {
    cwd: rootDir,
    env: process.env,
    encoding: 'utf8'
  });
  const tarballName = packResult.stdout.trim().split(/\r?\n/).pop();

  if (!tarballName) {
    throw new Error('npm pack did not return a tarball name');
  }

  const tarballPath = resolve(rootDir, tarballName);
  const installDir = await mkdtemp(join(tmpdir(), 'apk-cli-pack-'));
  try {
    await execFileAsync('npm', ['install', '--prefix', installDir, tarballPath], {
      cwd: rootDir,
      env: process.env,
      encoding: 'utf8'
    });

    const binPath = process.platform === 'win32'
      ? join(installDir, 'node_modules', '.bin', 'apk-cli.cmd')
      : join(installDir, 'node_modules', '.bin', 'apk-cli');

    return await runProcess(binPath, args, options?.cwd ?? installDir, options?.env);
  } finally {
    await rm(installDir, { recursive: true, force: true });
    await rm(tarballPath, { force: true });
  }
}

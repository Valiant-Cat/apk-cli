import { access, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';

export type ManagedMcpState = {
  pid: number;
  host: string;
  port: number;
  url: string;
  startedAt: string;
};

export function getDefaultMcpStateFile(): string {
  return resolve(homedir(), '.apk-cli', 'mcp', 'server.json');
}

export function resolveMcpStateFile(path?: string): string {
  return resolve(path ?? getDefaultMcpStateFile());
}

export async function readManagedMcpState(path: string): Promise<ManagedMcpState> {
  return JSON.parse(await readFile(path, 'utf8')) as ManagedMcpState;
}

export async function writeManagedMcpState(path: string, state: ManagedMcpState): Promise<void> {
  const target = resolveMcpStateFile(path);
  const tempFile = `${target}.tmp`;

  await mkdir(dirname(target), { recursive: true });
  await writeFile(tempFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  await rename(tempFile, target);
}

export async function removeManagedMcpState(path: string): Promise<void> {
  await rm(resolveMcpStateFile(path), { force: true });
}

export async function mcpStateFileExists(path: string): Promise<boolean> {
  try {
    await access(resolveMcpStateFile(path));
    return true;
  } catch {
    return false;
  }
}

export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

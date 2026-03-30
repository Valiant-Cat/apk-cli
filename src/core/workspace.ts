import { mkdir, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';

export type WorkspaceOptions = {
  baseDir: string;
};

export type Workspace = {
  root: string;
  logsDir: string;
  artifactsDir: string;
};

export async function createWorkspace(options: WorkspaceOptions): Promise<Workspace> {
  await mkdir(options.baseDir, { recursive: true });

  const root = await mkdtemp(join(options.baseDir, 'apk-cli-'));
  const logsDir = join(root, 'logs');
  const artifactsDir = join(root, 'artifacts');

  await mkdir(logsDir, { recursive: true });
  await mkdir(artifactsDir, { recursive: true });

  return { root, logsDir, artifactsDir };
}

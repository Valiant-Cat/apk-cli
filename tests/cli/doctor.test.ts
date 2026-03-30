import { describe, expect, it, vi } from 'vitest';
import { chmod, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { join, delimiter, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { runCli, runPackagedCli } from '../helpers/run-cli';
import { createWorkspace } from '../../src/core/workspace';
import { runApktoolDecode } from '../../src/toolchain/android-tools';
import { runCommand } from '../../src/toolchain/runner';

vi.mock('../../src/toolchain/runner', () => ({
  runCommand: vi.fn().mockResolvedValue({ stdout: '', stderr: '' })
}));

async function createFakeApktool() {
  const dir = await mkdtemp(join(tmpdir(), 'apk-cli-doctor-'));
  const binName = process.platform === 'win32' ? 'apktool.cmd' : 'apktool';
  const binPath = join(dir, binName);

  if (process.platform === 'win32') {
    await writeFile(binPath, '@echo off\r\necho apktool 1.0\r\nexit /b 0\r\n');
  } else {
    await writeFile(
      binPath,
      `#!/usr/bin/env node
process.stdout.write('apktool 1.0\\n');
`
    );
    await chmod(binPath, 0o755);
  }

  return {
    dir,
    cleanup: async () => {
      await rm(dir, { recursive: true, force: true });
    }
  };
}

function withPathPrefix(prefix: string) {
  return {
    PATH: `${prefix}${delimiter}${process.env.PATH ?? ''}`
  };
}

describe('cli bootstrap', () => {
  it('prints root help', async () => {
    const result = await runCli(['--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('apk-cli');
    expect(result.stdout).toContain('doctor');
  });

  it('prints root help from a packed install', async () => {
    const result = await runPackagedCli(['--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('apk-cli');
    expect(result.stdout).toContain('doctor');
  });

  it('prints doctor report as json with locked fields', async () => {
    const fixture = await createFakeApktool();
    try {
      const result = await runCli(['doctor', '--json'], { env: withPathPrefix(fixture.dir) });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe(
        `${JSON.stringify({ tools: [{ name: 'apktool', status: 'available' }] }, null, 2)}\n`
      );
    } finally {
      await fixture.cleanup();
    }
  });

  it('prints doctor report text with a stable semantic line', async () => {
    const fixture = await createFakeApktool();
    try {
      const result = await runCli(['doctor'], { env: withPathPrefix(fixture.dir) });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe('apktool: available\n');
    } finally {
      await fixture.cleanup();
    }
  });
});

describe('createWorkspace', () => {
  it('creates isolated directories for artifacts and logs', async () => {
    const baseDir = await mkdtemp(join(tmpdir(), 'apk-cli-workspace-'));
    const workspace = await createWorkspace({ baseDir });
    try {
      expect(relative(baseDir, workspace.root)).not.toMatch(/^(\.\.)($|\/|\\)/);
      expect((await stat(workspace.logsDir)).isDirectory()).toBe(true);
      expect((await stat(workspace.artifactsDir)).isDirectory()).toBe(true);
    } finally {
      await rm(workspace.root, { recursive: true, force: true });
      await rm(baseDir, { recursive: true, force: true });
      await expect(stat(baseDir)).rejects.toThrow();
    }
  });

  it('creates a fresh root directory on each call', async () => {
    const baseDir = await mkdtemp(join(tmpdir(), 'apk-cli-workspace-'));
    const first = await createWorkspace({ baseDir });
    const second = await createWorkspace({ baseDir });

    try {
      expect(first.root).not.toBe(second.root);
      expect(relative(baseDir, first.root)).not.toMatch(/^(\.\.)($|\/|\\)/);
      expect(relative(baseDir, second.root)).not.toMatch(/^(\.\.)($|\/|\\)/);
    } finally {
      await rm(baseDir, { recursive: true, force: true });
      await expect(stat(baseDir)).rejects.toThrow();
    }
  });
});

describe('runApktoolDecode', () => {
  it('invokes apktool decode with the expected flags', async () => {
    await runApktoolDecode('input.apk', 'output');

    expect(vi.mocked(runCommand)).toHaveBeenCalledWith('apktool', [
      'd',
      '-f',
      'input.apk',
      '-o',
      'output'
    ]);
  });
});

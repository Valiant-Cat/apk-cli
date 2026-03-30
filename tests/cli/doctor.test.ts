import { describe, expect, it } from 'vitest';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, delimiter } from 'node:path';
import { tmpdir } from 'node:os';
import { runCli, runPackagedCli } from '../helpers/run-cli';

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

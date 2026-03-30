import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseEditRequest } from '../../src/validators/edit-request';
import { runCli } from '../helpers/run-cli';

describe('parseEditRequest', () => {
  it('requires keystore credentials', () => {
    expect(() => parseEditRequest({ input: 'app.apk' })).toThrow(/keystore/i);
  });
});

describe('edit command', () => {
  it('prints a clear error when keystore credentials are missing', async () => {
    const result = await runCli(['edit', 'app.apk']);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('edit 命令缺少必要的 keystore 参数：keystore\n');
  });

  it('accepts the required edit parameters', async () => {
    const outputDir = await mkdtemp(join(tmpdir(), 'apk-cli-edit-test-'));

    try {
      const result = await runCli([
        'edit',
        'tests/fixtures/minimal-apk/app.apk',
        '--output',
        join(outputDir, 'edited.apk'),
        '--keystore',
        'tests/fixtures/keystore/debug.jks',
        '--store-pass',
        'android',
        '--key-alias',
        'debug',
        '--key-pass',
        'android'
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).toBe('');
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  });
});
